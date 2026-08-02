# Developer Setup

How to get Alexandria running locally. Read [README.md](./README.md) first for what the project is, and [CLAUDE.md](./CLAUDE.md) for the architecture.

The repo has **two deployables**: the **Portal** (repo root, Next.js) and the **Bridge** (`mcp/`, MCP server). You can develop the portal on its own; you only need the MCP server running locally if you are working on Bridge tools.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Access you need](#2-access-you-need)
3. [Portal environment](#3-portal-environment)
4. [Run the portal](#4-run-the-portal)
5. [MCP server (the Bridge)](#5-mcp-server-the-bridge)
6. [Database notes](#6-database-notes)
7. [Sanity content](#7-sanity-content)
8. [Azure AD notes](#8-azure-ad-notes)
9. [Deployment](#9-deployment)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

- **Node.js 20+** and **npm 10+**
- Access to a **PostgreSQL** database (the team uses Railway-hosted Postgres; a local Postgres also works)
- Accounts/membership listed in the next section

## 2. Access you need

Ask a project admin (the `owner` account) to grant these before you start:

- **Azure AD `Alexandria-Users` group membership** — this is the single sign-in gate. Without it, every sign-in is rejected with *Access Denied*.
- **Sanity project access** — to view content and obtain the project ID.
- **Railway project access** — to read the shared `DATABASE_URL` and other deployed environment values.
- The **Azure app registration** client ID/secret values (kept in Railway env vars, not in the repo).

## 3. Portal environment

Copy the example file and fill in every value:

```bash
cp .env.local.example .env.local
```

| Variable | Where it comes from |
|---|---|
| `AUTH_SECRET` | Generate locally: `npx auth secret` |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Azure app registration → Application (client) ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Azure app registration → Client secret **value** |
| `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` | Azure app registration → Directory (tenant) ID |
| `DATABASE_URL` | PostgreSQL connection string (from Railway, or your local Postgres) |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project settings |
| `NEXT_PUBLIC_SANITY_DATASET` | Usually `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | `2024-01-01` |
| `SANITY_API_TOKEN` | Sanity → API → Tokens (Editor token; needed for seeding and visual editing) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local dev |
| `NEXT_PUBLIC_MCP_URL` | The deployed MCP server URL — shown to admins on the Settings page. Optional locally. |

`.env.local` is git-ignored. Never commit real secrets — only `.env.local.example` is tracked.

## 4. Run the portal

```bash
npm install
npm run dev
```

- Portal: <http://localhost:3000>
- Sanity Studio (embedded): <http://localhost:3000/studio>

On your first sign-in, the portal lazily runs `migrate()` (`src/lib/schema.ts`), which creates/updates all Postgres tables, and upserts your user record. If the database is empty you start with `account_type = 'user'`; an `owner`/`admin` must promote you for full portal access.

`npm run build` and `npm run lint` cover production builds and linting. There is no test suite.

## 5. MCP server (the Bridge)

Only needed if you are working on `alexandria_*` tools.

```bash
cd mcp
npm install
cp <wherever you keep secrets> .env   # see variables below
npm run dev
```

`mcp/.env` (git-ignored) variables:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Same Postgres database as the portal |
| `SANITY_PROJECT_ID` | Same Sanity project |
| `SANITY_DATASET` | Defaults to `production` |
| `SANITY_API_VERSION` | Defaults to `2024-01-01` |
| `SANITY_API_TOKEN` | Sanity Editor token |
| `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` / `AZURE_TENANT_ID` | Azure app registration |
| `MCP_BASE_URL` | The server's own public URL (used in OAuth redirects) |
| `PORT` | Optional; defaults are handled by the server |

The MCP server runs its own `migrate()` for the OAuth/intake/feedback tables. The whole server is a single file: `mcp/src/index.ts`.

> **Adding or removing a tool requires practitioners to reconnect the connector** — Claude re-fetches the tool manifest only on reconnect. Editing existing content is live immediately.

## 6. Database notes

- There is **no migration tool**. The schema is the set of idempotent `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements in `migrate()`.
- To change the schema, **add idempotent statements to `migrate()`** (`src/lib/schema.ts` for portal tables, `mcp/src/index.ts` for Bridge tables). Never assume a fresh database — existing deployments re-run `migrate()` on every cold start / first sign-in.
- The portal and the MCP server share one database but open separate connection pools.

## 7. Sanity content

All editorial content lives in Sanity: methodologies, templates, client brand packages, practice areas, capability records, deliverable classifications, and the platform guide.

Seed a fresh dataset with baseline content:

```bash
npm run seed                                              # scripts/seed.mjs
node --env-file=.env.local scripts/seed-methodologies.mjs # other seeders
```

Edit content through the embedded Studio at `/studio`. Schemas are in `src/sanity/schemas/`; the Studio sidebar layout is `src/sanity/lib/structure.ts`.

## 8. Azure AD notes

- Auth is **single-tenant**. The issuer is `https://login.microsoftonline.com/{TENANT_ID}/v2.0`.
- The Azure app registration must have redirect URIs for every environment, including `http://localhost:3000/api/auth/callback/microsoft-entra-id` for local dev.
- Required API permissions (delegated, admin consent granted): `User.Read` and `GroupMember.Read.All`. `GroupMember.Read.All` must be present in **both** the authorize-scope and the token exchange, or group membership cannot be read and every user is rejected.
- The `Alexandria-Users` group ID is hardcoded as `GROUP_USERS` in `src/lib/auth.ts` and `mcp/src/index.ts`.

Full redirect-URI list and history are in `ref/portal-implementation-plan.md`.

## 9. Deployment

Both deployables run on **Railway** (not Vercel):

- **Portal** — `jda-alexandria-app-production.up.railway.app`
- **MCP server** — `mcp-production-3192.up.railway.app` (build/deploy config in `mcp/railway.json`)

Environment variables are managed in each Railway service.

### Claude Teams connector setup (admin, one-time)

The MCP connector is configured once at the Claude Teams org level. Individual practitioners don't configure it — they authorize via their own Azure AD login when they first use it.

| Field | Value |
|---|---|
| Name | Alexandria |
| Remote MCP server URL | `https://mcp-production-3192.up.railway.app/mcp` |
| OAuth Client ID | `AZURE_CLIENT_ID` value from the MCP Railway service variables |
| OAuth Client Secret | Leave blank — the secret lives server-side in Railway, never in the client |

**The OAuth Client ID is required.** Without it, the OAuth popup opens blank and never reaches the Microsoft login page. The value is the Azure app registration UUID (`AZURE_CLIENT_ID` in Railway env vars).

See `ref/portal-implementation-plan.md` for the full redirect URI list and OAuth permission requirements.

## 10. Troubleshooting

| Symptom | Likely cause |
|---|---|
| *Access Denied* on sign-in | Not in the `Alexandria-Users` Azure group |
| Signed in but no portal access | `account_type` is `user` / `portal_access` is false — an admin must promote you |
| Sign-in hangs at a blank OAuth popup | OAuth Client ID missing from the connector config |
| Every user rejected as unauthorized | `GroupMember.Read.All` missing from the authorize scope or token exchange |
| `DATABASE_URL is not set` (MCP) | `mcp/.env` not loaded — run via `npm run dev` from inside `mcp/` |
| Seed script fails | `SANITY_API_TOKEN` missing or not an Editor token |
