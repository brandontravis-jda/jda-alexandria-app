# JDA AI-Native Platform — Implementation Plan

> Updated June 24, 2026. Major architecture change: Sanity CMS fully removed and replaced with Postgres content tables + portal-native CRUD editors. Portal access model rebuilt around `portal_tier`. Admin panel separated from main navigation. Steps 1–5, 6.a, and 9.5 complete. Step 6.b partially complete (leadership dashboard shipped, executive and practice leader dashboards pending).

---

## Architecture Overview

The platform is a structured content and knowledge layer that makes Claude operationally intelligent for JDA (and eventually for external organizations). It consists of four components:

**The Portal** — A web app (Azure AD gated) that manages all platform content: methodologies, templates, client brand packages, capabilities matrix, deliverable classifications, platform guide. Content is stored in Postgres and edited through portal-native CRUD interfaces. The portal also houses the admin panel (user management, roles, practices, audit log) and a leadership performance dashboard. Access is tiered: viewers browse content, editors create/edit, leadership sees analytics, admins manage users and configuration. Most JDA practitioners never touch the portal — it is the management layer, not the practitioner experience.

**The Bridge** — An MCP server exposing the portal's content via Postgres so Claude can query it live. Practitioners interact with the platform entirely through Claude via this MCP connection. The MCP server is connected at the Claude Teams organization level; each practitioner authenticates individually via OAuth (Azure AD). The MCP server and portal share the same Postgres database.

**The Automation Layer** — n8n as the nervous system connecting the portal to Asana, Fireflies, Slack, and other operational tools. Handles background workflows (transcript routing, dashboard data, notifications) and powers LOB tool backends.

**The Claude Environment** — Claude Projects scoped per practice area and/or per client, with MCP providing live platform content on demand. The practitioner works in Claude. The platform ensures Claude has the right knowledge for the practitioner's role, practice, and client context.

### MCP Connector Configuration

The Alexandria connector is configured **once at the Claude Teams organization level** by an admin. Individual practitioners do not configure it — they authorize against it via their own Azure AD login when they first use it.

**Connector setup (admin, one-time):**
- **Name:** Alexandria
- **Remote MCP server URL:** `https://mcp-production-3192.up.railway.app/mcp`
- **OAuth Client ID:** `AZURE_CLIENT_ID` value from the MCP Railway service variables (the Azure app registration UUID)
- **OAuth Client Secret:** Leave blank — the secret lives server-side in Railway environment variables, never in the client

**Why the OAuth Client ID is required:** Claude Desktop uses it to identify which OAuth application to authorize against. Without it, the OAuth popup opens blank and never reaches the Microsoft login page. This was confirmed through a painful debugging session on March 31, 2026.

**Azure app registration — confirmed correct redirect URIs:**
- `https://mcp-production-3192.up.railway.app/oauth/callback`
- `https://jda-alexandria-app-production.up.railway.app/api/auth/callback/microsoft-entra-id`
- `http://localhost:3000/api/auth/callback/microsoft-entra-id`

**Azure API permissions required (both delegated, admin consent granted):**
- `User.Read`
- `GroupMember.Read.All` — required in BOTH the `/authorize` redirect scope AND the token exchange. If missing from either, group membership cannot be read and every user is rejected as unauthorized.

### MCP Connector Reauth Note

The connector is set at the org level — practitioners do not need to reconnect individually. However, reconnection is required whenever **new MCP tools are added** (Claude re-fetches the tool manifest on reconnect). This is a Claude protocol constraint. Content changes (edits to methodologies, brand packages, `platformGuide` text) are live immediately and never require reauth. A practitioner-facing changelog should communicate when a reconnect is needed. See Step 10 for changelog as portal content.

### Key Architecture Principle

The portal is NOT where practitioners go to do their work. Claude is. The portal is the management layer where content is created, organized, and published into Claude's ecosystem. The practitioner experience is: open Claude, and Claude already knows how JDA works — because the platform fed it the context.

LOB tools (RFP scraper, proposal generator, meeting intelligence) are the exception — these are standalone applications that live in the portal because they do things Claude can't do natively.

---

## Verified Tech Stack

| Layer | Technology | Status | Notes |
|---|---|---|---|
| Framework | Next.js 16 (App Router) | **Verified** | Server components, API routes, middleware |
| Language | TypeScript | **Verified** | Strict mode throughout |
| Styling | Tailwind CSS v4 | **Verified** | Custom CSS variables for theming |
| Auth (portal) | Auth.js v5 + Microsoft Entra ID | **Verified** | Azure AD SSO, single-tenant, Object ID as stable user identifier, 90-day session with daily refresh |
| Auth (MCP) | OAuth via Claude Teams connector | **Verified** | Org-level connector setup, per-user OAuth authorization via Azure AD, 90-day sliding sessions |
| Database | PostgreSQL on Railway | **Verified** | Direct SQL via `postgres` npm package, no ORM. Stores all content, users, sessions, audit logs |
| Content store | PostgreSQL | **Verified** | All content migrated from Sanity to Postgres (June 2026). Portal-native CRUD editors replace Sanity Studio |
| MCP server | Standalone Node.js service | **Verified** | `@modelcontextprotocol/sdk`, Streamable HTTP transport, reads/writes directly to shared Postgres |
| Hosting | Railway (all services) | **Verified** | Single Railway project, multiple services, shared PostgreSQL. Auto-deploy on push to `main` |
| Source control | GitHub | **Verified** | CI/CD via Railway auto-deploy |
| Automation | n8n on Railway | Planned | Same Railway project |
| File storage | None (platform stores text; files live in Dropbox) | **Resolved** | See Storage Architecture below |

---

## Authentication Architecture

### Two Auth Contexts

| Context | Who | How | What It Does |
|---|---|---|---|
| Portal sign-in | Tiered access (viewers, editors, leadership, admins) | Auth.js v5 + Entra ID, JWT session with 90-day maxAge | Portal access scoped by `portal_tier` |
| MCP via Claude | All JDA practitioners (~33 people) | OAuth via Claude Teams custom connector, Azure AD | Access platform content through Claude, gated by `mcp_access` flag and role permissions |

### Portal Tier Model (June 2026 rebuild)

Portal access is controlled by a single `portal_tier` column on the `users` table. Tiers are hierarchical — each includes all capabilities of the tiers below it.

| Tier | What they access |
|---|---|
| `none` | Redirected to informational page explaining Alexandria and how to use it via Claude |
| `viewer` | Dashboard, all content (read-only), capabilities matrix, client brand packages |
| `editor` | Everything viewers see + create, edit, delete content |
| `leadership` | Everything editors see + performance analytics dashboard |
| `admin` | Full platform access + Admin Panel (users, roles, practices, audit log, settings) |

Tier changes take effect on the user's next page load (no sign-out required). The portal layout calls `noStore()` and checks `portal_tier` from Postgres on every navigation.

### Account Types

| Account Type | Description |
|---|---|
| `owner` | One per system. Full permissions everywhere. Can transfer ownership. Always `admin` tier. |
| `admin` | Portal admin. Always has admin tier access. |
| `user` | Standard practitioner. Portal tier and MCP access controlled by admin. |

### MCP Role-Based Permissions

MCP tool access is controlled by a separate RBAC system (distinct from portal tiers). Roles define capability groups with `resource:operation` permissions and scope (`all` / `none`). Multiple roles per user, additive. System roles: `editor`, `practitioner`.

**Effective permission resolution:** union of all role permissions + user grants − user denials. Owner bypasses all permission checks. The `mcp_access` boolean gates whether a regular user can use gated MCP tools at all.

**Ungated MCP tools (always accessible):** `alexandria_whoami`, `alexandria_help`, `alexandria_give_feedback`, `alexandria_log_feedback`

### Debug Mode (owner only)

Owner can temporarily impersonate a role's permission set for testing via the Settings page or `alexandria_debug_as_role` / `alexandria_debug_exit` in Claude. Session-based — clears on next login or explicit exit. Amber banner in portal, near-realtime sync (3s poll) between portal and Claude.

### API Keys (Secondary Auth)

Active — used for programmatic access. Claude connector uses OAuth (primary path); API key is a fallback. **TODO: Decide whether to keep, restrict, or remove API keys.** Currently live and functional but not the intended practitioner flow. No expiry on keys (live until manually deleted).

---

## Storage Architecture

All authored content is stored in Postgres. Raw asset files live in Dropbox.

| Content | Where It Lives | How It's Accessed |
|---|---|---|
| Production methodologies (steps, instructions, quality checks) | Postgres `methodologies` table | Portal CRUD editors, MCP tools |
| Templates (production instructions, format specs) | Postgres `templates` table | Portal CRUD editors, MCP tools |
| Client brand packages (identity, colors, typography, voice, messaging) | Postgres `brand_packages` table | Portal CRUD editors, MCP tools |
| Capability records (deliverable taxonomy, AI classification, status) | Postgres `capability_records` table | Portal capabilities page, MCP tools |
| Deliverable classifications | Postgres `deliverable_classifications` table | Portal editors, MCP tools |
| Platform guide (intro, entry prompts, feedback prompt) | Postgres `platform_guide` table | Portal editor, MCP `alexandria_help` |
| Practice areas | Postgres `practices` table | Portal admin, used as FK across content |
| Brand guidelines PDFs | Dropbox (existing) | Postgres stores Dropbox link |
| LOB tool output | Railway disk (ephemeral) → Dropbox (permanent via n8n) | LOB tools generate to Railway, n8n routes to Dropbox |

---

## Portal Information Architecture

### Main Navigation (all portal users)

| Route | Tier | Description |
|---|---|---|
| `/` | viewer | Dashboard — content counts, recently updated, practice areas, recent sign-ins |
| `/capabilities` | viewer | Capabilities matrix — sortable table, pill filters, stats strip, CSV export |
| `/content` | viewer | Content hub with counts and links to all content sections |
| `/content/methodologies` | viewer (read) / editor (write) | List, create, search methodologies |
| `/content/methodologies/[id]` | viewer (read) / editor (write) | Full methodology editor |
| `/content/templates` | viewer (read) / editor (write) | List, create, search templates |
| `/content/templates/[id]` | viewer (read) / editor (write) | Full template editor |
| `/content/deliverables` | viewer (read) / editor (write) | List with inline create/edit for deliverable classifications |
| `/content/platform-guide` | viewer (read) / editor (write) | Platform guide editor |
| `/clients` | viewer (read) / editor (write) | Brand package list with search |
| `/clients/[id]` | viewer (read) / editor (write) | Full brand package editor |
| `/tools` | leadership | Performance analytics dashboard (MCP usage, adoption, top content) |

### Admin Panel (via profile dropdown → "Admin Panel")

| Route | Description |
|---|---|
| `/admin/users` | User management — search, sort, filter, bulk tier, role/practice assignment, AD sync, MCP sessions |
| `/admin/roles` | Role CRUD with permission grid |
| `/admin/practices` | Practice area CRUD with member counts |
| `/admin/audit-log` | Chronological audit log of all admin and content mutations |
| `/admin/settings` | API keys, debug mode (owner), org defaults |

### MCP Tool Inventory (22 tools, all on Postgres)

| Category | Tool | Description |
|---|---|---|
| **Methodologies** | `alexandria_list_methodologies` | Browse methodologies, optional practice filter |
| | `alexandria_get_methodology` | Full methodology with steps, instructions, quality checks |
| | `alexandria_save_methodology` | Create or update a methodology via Claude |
| **Templates** | `alexandria_list_templates` | Browse active templates |
| | `alexandria_get_template` | Full template with intake session initiation |
| | `alexandria_submit_intake` | Complete intake questions for a template session |
| | `alexandria_build_template` | Execute template production (requires completed intake) |
| **Brand Packages** | `alexandria_list_brand_packages` | Browse all client brand packages |
| | `alexandria_get_brand_package` | Full brand package (identity, colors, typography, voice) |
| | `alexandria_save_brand_package` | Create or update a brand package via Claude |
| **Capabilities** | `alexandria_list_capabilities` | Browse capability records with filters |
| | `alexandria_get_capability` | Full capability assessment |
| | `alexandria_update_capability` | Classify or update a capability record |
| | `alexandria_log_capability_gap` | Flag an unknown deliverable type |
| **Reference** | `alexandria_list_practice_areas` | Browse practice areas |
| | `alexandria_list_deliverables` | Browse deliverable classifications |
| | `alexandria_help` | Platform discovery — inventory, entry prompts, tier info |
| | `alexandria_whoami` | Current user, roles, permissions, debug status |
| **Feedback** | `alexandria_give_feedback` | Start a structured feedback session |
| | `alexandria_log_feedback` | Submit feedback answers |
| **Debug** | `alexandria_debug_as_role` | Owner-only: impersonate a role's permissions |
| | `alexandria_debug_exit` | Owner-only: exit debug mode |

---

## Build Sequence

### Step 1: Portal Foundation + Proof of Concept — ✅ COMPLETE

**Portal foundation:**
- ✅ Next.js app on Railway with Auth.js v5 + Entra ID
- ✅ Azure AD security group (`Alexandria-Users`) as single auth gate
- ✅ PostgreSQL schema for users, api_keys, oauth_sessions
- ✅ Auth middleware protecting all portal routes
- ✅ Users management page

**MCP server:**
- ✅ OAuth via Claude Teams custom connector (PKCE flow, our server acts as auth server)
- ✅ Azure AD group membership checked on every OAuth login
- ✅ Session tokens in PostgreSQL, 90-day sliding expiry
- ✅ API key fallback for programmatic access
- ✅ Permission gating validated end-to-end

**Content type: Production Methodologies:**
- ✅ 4 methodologies seeded: pre-discovery brief, post-discovery brief, client strategy brief, brand package extraction
- ✅ `alexandria_list_methodologies`, `alexandria_get_methodology`, `alexandria_save_methodology`

**Content type: Client Brand Packages:**
- ✅ 16 brand packages loaded (HBI, Biglife, CHM, Conquer, Envisage, Hopebridge, Indy Chamber, Indy Partnership, JDA, Kingsworth, Prolific, Spokenote, The Gardens, Venture, WIF, Bargersville)
- ✅ `alexandria_list_brand_packages`, `alexandria_get_brand_package`, `alexandria_save_brand_package`

**Validated end-to-end:** HBI post-discovery brief produced on-brand output using real HBI colors and voice pulled from Alexandria.

---

### Step 2: Templates — ⚠ PARTIALLY COMPLETE

**Architecture decision:** All HTML deliverable types consolidated into a single `html-deliverable` template with a feature menu. One template to maintain, infinite combinations.

**Status note:** Schema, MCP tools, and intake enforcement are complete. End-to-end testing revealed the template system is not yet production-ready — Claude generates HTML structure from scratch rather than from a canonical source.

**Complete:**
- ✅ Template schema with production instruction fields
- ✅ `alexandria_list_templates`, `alexandria_get_template`
- ✅ Intake enforcement — session-gated flow (`alexandria_submit_intake`, `alexandria_build_template`)
- ✅ Canonical entry prompt convention
- ✅ Brand-specific template overrides (`templateOverrides` field on brand packages)
- ✅ Web font injection (`webFonts[]` on brand packages)
- ✅ Logo variants (`logos[]` on brand packages)
- ✅ Portal CRUD editor for templates (June 2026)

**Templates loaded:**
- ✅ HTML Deliverable (`html-deliverable`) — active
- ✅ JDA Document Style (`jda-document-style`) — active
- ✅ Slideshow Presentation — active
- ⬜ Campaign Brief — pending discovery
- ⬜ Client Proposal — pending discovery

**Remaining:**
- ⬜ **Canonical HTML source in GitHub (P0).** `githubRawUrl` field exists but no canonical file. Claude generates CSS/JS from scratch producing inconsistent output.
- ⬜ **Re-extract all brand packages (P1).** `logos[]`, `webFonts[]`, `logoUsageRules`, `templateOverrides` unpopulated on existing packages.
- ⬜ `alexandria_save_template` write tool — not yet built
- ⬜ Campaign Brief + Client Proposal templates — pending discovery

---

### Step 3: Alexandria Help + Platform Discovery Surface — ✅ COMPLETE

- ✅ `alexandria_help` MCP tool — tier-aware, pulls from Postgres `platform_guide`, structured inventory
- ✅ `alexandria_request_log` table — all MCP tool calls logged
- ✅ `platform_guide` content (platformIntro, canonicalEntryPrompts, examplePrompts, feedbackPrompt)
- ✅ Unsupported request flow
- ✅ Portal CRUD editor for platform guide (June 2026)

---

### Step 4: Capabilities Matrix — ✅ COMPLETE (with open human-work items)

- ✅ `capability_records` table — 79 records across 8 practice areas, 4-stage status pipeline, AI classification
- ✅ `alexandria_list_capabilities`, `alexandria_get_capability`, `alexandria_update_capability`, `alexandria_log_capability_gap`
- ✅ Portal capabilities page — sortable table, pill filters, stats strip, CSV export (migrated from Sanity to Postgres June 2026)
- ✅ Portal CRUD editor for capability records (June 2026)

**Open items (human work, not code):**
- ⬜ Human review of 79 capability records by practice leaders
- ⬜ Asana history extraction to supplement deliverable inventory
- ⬜ Human-Led methodology authoring (video, logo, brand discovery, crisis comms)
- ⬜ Discovery Intensives to move records from `not_evaluated` to `classified`
- ⬜ Define Proven Status threshold (suggested: ≥3 feedback entries, majority A/B scores)

---

### Step 5: Auth Model + Permissions Infrastructure — ✅ COMPLETE (shipped April 2, 2026; rebuilt June 2026)

**April 2026:** Built account types + RBAC with granular permissions. Single Azure AD group gate. Debug mode. Owner bootstrap.

**June 2026 rebuild:**
- ✅ Replaced `portal_access` boolean with `portal_tier` (`none`/`viewer`/`editor`/`leadership`/`admin`)
- ✅ Centralized portal auth via `requireTier()` and `apiRequireTier()` helpers
- ✅ Removed `own_practice` scope gating from MCP — practices are reporting metadata only
- ✅ Admin panel separated from main navigation to `/admin` route group
- ✅ Content UI gated by tier — viewers read-only, editors can create/edit/delete
- ✅ 90-day session expiry added to portal (NextAuth `maxAge`)
- ✅ Tier cache fix — `noStore()` ensures DB check on every navigation
- ✅ Audit logging added for: portal sign-in, API key create/revoke, ownership transfer
- ✅ Proactive AD sync — pulls all Azure group members before they log in
- ✅ Users admin page rebuilt with search, sort, filter, bulk actions

**Open items:**
- ⬜ API keys: keep/restrict/remove decision pending
- ⬜ Role permission grid UX revisit (functional but unwieldy at scale)

---

### Step 6.a: Portal Browse Experience and Application Shell — ✅ COMPLETE (June 2026)

**What was built (supersedes original spec which assumed Sanity Studio as editor):**

- ✅ Full portal-native CRUD editors for all content types (replaces Sanity Studio)
- ✅ 12 content API routes (GET/POST/PATCH/DELETE for methodologies, templates, brand packages, capabilities, deliverables, platform guide)
- ✅ 9 content pages with list views, search, detail editors, and proper tier gating
- ✅ Dashboard with live Postgres aggregates (content counts, recent updates, practice areas, user stats)
- ✅ Capabilities matrix page migrated from Sanity to Postgres
- ✅ All navigation routes resolve to implemented pages — no 404s, no placeholders
- ✅ Admin panel with dedicated sub-navigation (Users, Roles, Practices, Audit Log, Settings)
- ✅ Sanity fully removed — Studio, schemas, npm deps, all dead code deleted (-16,287 lines)

---

### Step 6.b: Measurement and Dashboard Layer — ⚠ PARTIALLY COMPLETE

**Complete:**
- ✅ Leadership dashboard at `/tools` — MCP usage metrics, tool breakdown, practice usage, top users, top content, recent activity, configurable time period (7/30/90 days)
- ✅ Analytics API (`/api/content/analytics`) sourcing from `alexandria_request_log` and `users`
- ✅ `alexandria_request_log` captures all MCP tool calls with user, tool, request summary, matched capability

**Remaining:**
- ⬜ Executive dashboard for Chance — transformation progress, proven status progression, practice-by-practice breakdown (sourced from capability records)
- ⬜ Practice leader dashboard — their practice slice of capabilities + team MCP usage
- ⬜ Feedback/quality signals on capabilities page (from `production_feedback`)
- ⬜ Capability gap trend reporting (from `alexandria_log_capability_gap`)
- ⬜ n8n automation workflows (first workflow TBD)

**Primary metrics (defined in Step 4 discovery):**
- Production time reduction by deliverable type (before/after from Capability Records)
- Proven Status progression (% of JDA's production surface area validated AI-native)

**Secondary metrics:**
- MCP usage volume by practice and practitioner (leading indicator of adoption)
- Classification coverage (% of identified workflows evaluated)

**Executive metrics (Chance):**
- Blended production time reduction across agency (target: 50% at 6 months)
- Proven Status count and practice distribution

---

### Step 7: Claude Project Architecture — ✅ RESOLVED THROUGH DISCOVERY. NO ACTION REQUIRED.

MCP is proven. Projects + MCP works. Chat + Alexandria MCP + org skills is the primary practitioner experience, Projects are optional collaboration spaces.

---

### Step 8: LOB Tools — ⏭ SKIP

Priority candidates: RFP scraper, proposal generator, meeting intelligence pipeline, client onboarding playbook builder. Depends on specific tool requirements from practice activations.

---

### Step 8.5: Extending Claude — Full Discovery Required

Skills, Extensions, and Plugins strategy not yet defined. Org-provisioned skill candidates identified but not authored (JDA brand voice, writing standards, meeting note format). See original discovery questions in previous plan version.

---

### Step 9: Claude Project Setup Wizard — LIKELY OBSOLETE OR MUCH SMALLER

May be unnecessary or repurposed as a content package generator.

---

### Step 9.5: Production Feedback Loop — ✅ COMPLETE (shipped April 2, 2026)

- ✅ `alexandria_give_feedback` and `alexandria_log_feedback` MCP tools
- ✅ `feedback_sessions` and `production_feedback` tables
- ✅ 5 structured questions (editing needed, shortfalls, intake adequacy, reuse intent, observations)
- ✅ `includeFeedbackPrompt` flag on methodologies/templates triggers feedback prompt injection
- ✅ `platformGuide.feedbackPrompt` as single source of truth for prompt text

**Portal surface:** Feedback presentation deferred to Step 6.b dashboards.

---

### Step 10: Content Expansion from Discovery

Ongoing — as practice leader discoveries happen, new content flows into the portal through CRUD editors or through Claude via MCP write tools (`alexandria_save_methodology`, `alexandria_save_brand_package`, `alexandria_update_capability`).

**Changelog:** When new MCP tools are added, practitioners need to reconnect. A lightweight changelog (date, summary, requires_reauth) should be added to `platform_guide` and surfaced in the portal. Low priority.

---

### Step 11: Initial Launch

The platform is live with real content across all content types. MCP bridge working with OAuth. A practitioner can sit in Claude and operate AI-native using platform-managed content.

---

## Security Model & Known Gaps

### Layers of Protection (as built)

| Layer | What it does | Status |
|---|---|---|
| Azure AD tenant restriction | Only accounts in the JDA tenant can authenticate at all | Live |
| `Alexandria-Users` group gate | Non-members get `AccessDenied` and see error message on `/sign-in` | Live |
| Portal auth middleware (`src/middleware.ts`) | All routes require active session — unauthenticated → `/sign-in` | Live |
| Portal layout guard + `noStore()` | Fresh `portal_tier` check from Postgres on every navigation | Live |
| Portal tier gating (`requireTier()`) | Pages and API routes enforce minimum tier | Live |
| Content UI tier gating | Viewers see read-only; editors see create/edit/delete controls | Live |
| Admin panel gate (`requireTier("admin")`) | `/admin` routes require admin tier | Live |
| Portal session expiry | 90-day maxAge with daily refresh | Live |
| Owner guard on user mutations | Cannot modify or demote an `owner` account | Live |
| MCP OAuth session tokens | Every MCP request requires a valid bearer token, 90-day sliding expiry | Live |
| MCP `mcp_access` gate | Regular users need `mcp_access = true` for gated tools | Live |
| MCP permission gating | Tool access resolved via `checkPermission()` — role-based, with user overrides | Live |
| MCP API key fallback | Secondary auth for programmatic access | Live |
| Debug mode scoped to owner | `alexandria_debug_as_role` / `alexandria_debug_exit` reject non-owner accounts | Live |
| Audit logging | Portal sign-in, content mutations, user changes, API key ops, ownership transfer, AD sync | Live |
| Proactive AD sync | Pulls all Azure group members before they log in; soft-disables users who leave group | Live |

### Known Gaps

1. **MCP pending flow state is in-memory** — a server restart during OAuth drops the flow. Low risk on single-replica Railway. Long-term: move to PostgreSQL.
2. **No MCP request rate limiting** — should be added before public rollout.
3. **API keys: unresolved decision** — keys exist and work. No expiry. No current users of API key path.
4. **No automated AD sync trigger** — cron-ready endpoint exists, but no scheduler configured.

### Security Testing Checklist (Before Team Rollout)

- ✅ Confirm a JDA account NOT in `Alexandria-Users` gets `AccessDenied` → red error on `/sign-in`
- [ ] Confirm that unauthorized account cannot complete MCP OAuth either
- [ ] Assign a user `user` account type with only the `practitioner` role — confirm system instructions are blocked in Claude
- [ ] Confirm unauthenticated requests to `/api/users` return 401
- [ ] Confirm a `user` account type cannot access `/api/users` (admin-only)
- [ ] Confirm MCP requests with an expired/invalid token return 401
- [ ] Confirm MCP requests with a practitioner-role token cannot read gated methodology fields
- [ ] Confirm an admin cannot modify an owner account via the Users API
- ✅ Transfer ownership to a second account — confirm original drops to `admin`, new account is `owner`
- ✅ While in debug mode as Practitioner, attempt a tool Practitioner doesn't have — confirm it is blocked
- [ ] Confirm `alexandria_whoami` via API key shows real owner permissions, ignores any active debug session

---

## Postgres Schema Overview

### User & Auth Tables
- `users` — id, object_id, email, name, account_type, practice, portal_tier, mcp_access, last_seen_at, last_mcp_seen_at
- `api_keys` — user_id, key_hash, key_prefix, name, last_used_at
- `oauth_sessions` — user_id, access_token_hash, expires_at, debug_role_id
- `org_config` — singleton for org-level settings

### RBAC Tables
- `roles` — id, name, slug, description
- `role_permissions` — role_id, action, scope (all/none)
- `user_roles` — user_id, role_id
- `user_permissions` — user_id, action, type (grant/deny), scope
- `user_practices` — user_id, practice_id (M2M)

### Content Tables
- `practices` — name, slug, description, activation_status, sanity_id
- `methodologies` — 25+ fields including steps (JSONB), quality_checks (JSONB), system_instructions, tools_involved
- `templates` — format_type, production instruction fields, practice/methodology links via join tables
- `template_practices`, `template_methodologies` — M2M join tables
- `brand_packages` — 20+ fields including identity (JSONB), color_palette (JSONB), typography (JSONB), voice_and_tone (JSONB)
- `capability_records` — deliverable_name, practice_id FK, status pipeline, ai_classification, linked_methodology FK
- `deliverable_classifications` — name, practice_id FK, ai_classification
- `platform_guide` — singleton, platform_intro, canonical_entry_prompts (JSONB), feedback_prompt, example_prompts (JSONB)

### Operational Tables
- `alexandria_request_log` — user_id, tool_name, request_summary, matched_capability, capability_type, capability_id
- `audit_log` — actor_id, action, target_type, target_id, details (JSONB)
- `intake_sessions` — template intake session state
- `feedback_sessions` — feedback session state
- `production_feedback` — structured feedback (editing_needed, shortfalls, intake_adequate, would_use_again, observation)

---

*Updated June 24, 2026. Steps 1–5, 6.a, and 9.5 complete. Step 6.b partially complete (leadership dashboard shipped). Sanity fully removed — all content in Postgres with portal-native editors. Portal access model rebuilt around `portal_tier`. Admin panel separated to `/admin`. 22 MCP tools all on Postgres. Steps 7, 8, 8.5, 9, 10, 11 unchanged from prior plan.*
