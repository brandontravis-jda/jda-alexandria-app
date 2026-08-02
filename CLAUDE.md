# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Alexandria** is JDA's AI-native operational platform. Practitioners do their work inside Claude; the platform feeds Claude the right context (methodologies, templates, brand packages, capabilities) for their role, practice, and client. This repo holds two of the four platform components:

- **The Portal** (repo root, Next.js app) — an Azure AD–gated web app for a small admin group that manages all platform content and user/role administration. Most practitioners never open it. Sanity Studio is embedded at `/studio`.
- **The Bridge** (`mcp/`, separate package) — a remote MCP server that exposes the portal's content to Claude. Practitioners interact with the platform almost entirely through this. Deployed to Railway, connected once at the Claude Teams org level.

The other two components (n8n automation layer, per-practice Claude Projects) live outside this repo.

> **Heads-up on origin:** `README.md`, `SETUP.md`, and `.cursorrules` still describe the original "JDA Catalyst" Next.js + Sanity *starter template* this repo was forked from. The page-builder modules in `src/components/modules/` and `src/components/PageBuilder.tsx` are leftover starter code — they are **not** wired into any route. The live app is the `(portal)` route group. Trust this file over those documents where they conflict.

## Commands

Portal (repo root):

```bash
npm run dev      # next dev — portal at :3000, Sanity Studio at :3000/studio
npm run build    # next build
npm run lint     # eslint
npm run seed     # node --env-file=.env.local scripts/seed.mjs — populate Sanity
```

Other `scripts/seed-*.mjs` files seed specific content sets (methodologies, capabilities, platform guide); run them the same way: `node --env-file=.env.local scripts/<file>.mjs`.

MCP server (`mcp/`, run from inside `mcp/`):

```bash
npm run dev      # node --env-file=.env --import tsx/esm src/index.ts
npm run build    # tsc
npm run start    # node dist/index.js
```

There is no test suite.

## Architecture

### Two data stores

- **Postgres** (`postgres` driver) — all users, roles, permissions, sessions, intake sessions, feedback. Portal access via `src/lib/db.ts` + `src/lib/schema.ts`; the MCP server has its own connection and migrations in `mcp/src/index.ts`.
- **Sanity** — all editorial content (methodologies, templates, brand packages, practice areas, capability records, platform guide). Schemas in `src/sanity/schemas/`, queries in `src/sanity/lib/queries.ts`.

### Migrations

There is no migration tool. `migrate()` in `src/lib/schema.ts` (and a separate one in `mcp/src/index.ts`) is a sequence of idempotent `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements, including in-place rename/backfill blocks for legacy columns. The portal's `migrate()` runs lazily on the first sign-in JWT callback (guarded by a module-level `migrated` flag). **To change the schema, add idempotent statements to `migrate()`** — never assume a fresh database.

### Authentication & authorization

- **Single auth gate:** membership in the Azure AD `Alexandria-Users` group (`GROUP_USERS` constant, hardcoded in both `src/lib/auth.ts` and `mcp/src/index.ts`). `signIn` fetches the user's group membership from Microsoft Graph and rejects anyone not in the group.
- **Portal auth:** Auth.js v5 (`next-auth` beta) + Microsoft Entra ID provider. The Azure **Object ID** (`oid`) is the stable user identifier — it is `session.user.id` and the `users.object_id` column. `src/middleware.ts` redirects unauthenticated requests to `/sign-in` (allowlisting `/api/auth`, `/studio`, `/sign-in`, static assets).
- **MCP auth:** per-user OAuth against Azure AD, brokered by the MCP server's own `/oauth/*` endpoints; sessions stored in the `oauth_sessions` table.
- **Authorization is app-managed**, not from Azure. Once authenticated, a user's `account_type` (`owner` / `admin` / `user`), `roles`, and `role_permissions` (action + scope) are all stored in Postgres and managed through the portal.

### Portal routes

Everything live is under the `src/app/(portal)/` route group, which shares `(portal)/layout.tsx` (auth check, `Topbar`, `DebugBanner`). Pages: dashboard, content (methodologies/templates/deliverables/platform-guide), clients, capabilities, tools, users, roles, settings. JSON APIs under `src/app/api/` (`me`, `users`, `roles`, `capabilities`, `keys`, `org-config`).

### MCP tools

`mcp/src/index.ts` (single ~2,500-line file) registers ~21 `alexandria_*` tools — read tools (`list_*`, `get_*`), workflow tools (`submit_intake`, `build_template`, `give_feedback`/`log_feedback`), admin tools (`save_brand_package`, `update_capability`, `log_capability_gap`), and `debug_as_role` / `debug_exit` for permission impersonation. **Adding or removing a tool requires practitioners to reconnect the connector** (Claude re-fetches the tool manifest on reconnect); content changes do not.

### Sanity content flow

- Fetch content **only in server components** via `sanityFetch()` from `src/sanity/lib/client.ts`. Pass tags for ISR; without tags it falls back to 60s revalidation.
- Studio is embedded at `/studio`; its desk structure is `src/sanity/lib/structure.ts`, config `src/sanity/sanity.config.ts`.
- Document schemas in `src/sanity/schemas/documents/`, objects in `objects/`, all registered in `schemas/index.ts`.

## Conventions

- Path alias `@/*` → `src/*`. TypeScript strict mode; never `any`.
- Components: one directory with `index.tsx` (default export) and optional `types.ts`; props interface `[ComponentName]Props`.
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes.
- Tailwind CSS v4, utility classes only. Theme tokens (colors, fonts) live in the `@theme` block of `src/app/globals.css`; portal UI also uses `var(--color-jda-*)` CSS variables — never hardcode colors.
- Display strings for enum-like DB/Sanity values go through label maps in `src/lib/portal-labels.ts`.

## Environment

Portal env in `.env.local` (see `.env.local.example`): `DATABASE_URL`, `NEXT_PUBLIC_SANITY_*`, `SANITY_API_TOKEN`, `AUTH_MICROSOFT_ENTRA_ID_ID` / `_SECRET` / `_TENANT_ID`, `AUTH_SECRET`. The MCP server uses its own `mcp/.env` with `DATABASE_URL`, `SANITY_*`, `AZURE_CLIENT_ID` / `_SECRET` / `_TENANT_ID`, `MCP_BASE_URL`.

The portal deploys to Railway (`jda-alexandria-app-production.up.railway.app`); the MCP server deploys to Railway separately (`mcp-production-3192.up.railway.app`, see `mcp/railway.json`). Azure redirect URIs and the full deployment story are documented in `ref/portal-implementation-plan.md`.
