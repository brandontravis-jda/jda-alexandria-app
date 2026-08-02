# Alexandria

JDA's AI-native operational platform. Practitioners do their work inside **Claude**; Alexandria feeds Claude the right operational context — methodologies, templates, client brand packages, capabilities — for each practitioner's role, practice, and client.

This repository holds two of the platform's four components:

- **The Portal** (repo root) — a Next.js web app, gated to a small admin group via Azure AD. It manages all platform content (with Sanity Studio embedded at `/studio`) and handles user/role administration. Most practitioners never open it.
- **The Bridge** (`mcp/`) — a remote MCP server that exposes the portal's content to Claude as `alexandria_*` tools. This is how practitioners actually use the platform. Deployed separately and connected once at the Claude Teams org level.

The other two components — the n8n automation layer and per-practice Claude Projects — live outside this repo.

> **New here?** See **[SETUP.md](./SETUP.md)** for step-by-step local setup, and **[CLAUDE.md](./CLAUDE.md)** for an architecture orientation.

## Stack

- **Framework:** Next.js 16 (App Router, React 19), TypeScript strict mode
- **Styling:** Tailwind CSS v4 with CSS-variable design tokens
- **Auth:** Auth.js v5 + Microsoft Entra ID (single-tenant Azure AD SSO)
- **Databases:** PostgreSQL (users, roles, permissions, sessions, intake & feedback) + Sanity (editorial content)
- **MCP server:** `@modelcontextprotocol/sdk` over Streamable HTTP, deployed to Railway
- **Hosting:** Railway (both the portal and the MCP server)

## Quick start

```bash
# 1. Install dependencies (portal)
npm install

# 2. Configure environment
cp .env.local.example .env.local   # then fill in every value — see SETUP.md

# 3. Run the portal
npm run dev
```

The portal runs at [localhost:3000](http://localhost:3000); Sanity Studio is embedded at [localhost:3000/studio](http://localhost:3000/studio).

To run the MCP server locally, see [SETUP.md](./SETUP.md#5-mcp-server-the-bridge).

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the portal (Next.js dev server) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run seed` | Seed Sanity with baseline content (`scripts/seed.mjs`) |

Additional `scripts/seed-*.mjs` files seed specific content sets. Run any of them with `node --env-file=.env.local scripts/<file>.mjs`.

MCP server commands live in `mcp/package.json` and are run from inside `mcp/`.

There is no automated test suite.

## Project structure

```
src/
├── app/
│   ├── (portal)/          # The live app — all portal pages share this layout
│   │   ├── page.tsx       # Dashboard
│   │   ├── content/       # Methodologies, templates, deliverables, platform guide
│   │   ├── clients/       # Client brand packages
│   │   ├── capabilities/  # Capability matrix
│   │   ├── tools/         # LOB tools
│   │   ├── users/ roles/  # User & role administration
│   │   └── settings/
│   ├── api/               # JSON endpoints (me, users, roles, capabilities, keys, …)
│   ├── studio/            # Embedded Sanity Studio
│   └── sign-in/ sign-out/
├── components/
│   ├── portal/            # Portal UI (Topbar, StatCard, rows, panels)
│   ├── ui/                # Primitives (Button, Container, SanityImage, …)
│   ├── global/ modules/   # ⚠️ Leftover starter code — not wired into any route
│   └── PageBuilder.tsx    # ⚠️ Leftover starter code
├── lib/                   # auth.ts, db.ts, schema.ts (Postgres), utils, labels
├── middleware.ts          # Auth gate for all non-public routes
└── sanity/                # Client, GROQ queries, schemas, Studio config

mcp/                       # The Bridge — standalone MCP server (own package.json)
scripts/                   # Sanity seed scripts
ref/                        # Planning docs (see portal-implementation-plan.md)
```

> The `src/components/global/`, `src/components/modules/`, and `PageBuilder.tsx` files are inherited from the "JDA Catalyst" starter template this repo was forked from. They are **not used** by the live app — do not build on them.

## Architecture in brief

- **One auth gate:** membership in the Azure AD `Alexandria-Users` group. Sign-in checks group membership via Microsoft Graph and rejects everyone else.
- **App-managed authorization:** once signed in, a user's `account_type` (`owner`/`admin`/`user`), roles, and permissions live in Postgres and are managed through the portal — Azure only authenticates.
- **No migration tool:** the database schema is defined by idempotent statements in `migrate()` (`src/lib/schema.ts` for the portal, `mcp/src/index.ts` for the Bridge). The portal's `migrate()` runs lazily on first sign-in.
- **Content lives in Sanity:** fetched in server components only, via `sanityFetch()` from `src/sanity/lib/client.ts`.

See [CLAUDE.md](./CLAUDE.md) for the full orientation and `ref/portal-implementation-plan.md` for the platform plan and deployment details.
