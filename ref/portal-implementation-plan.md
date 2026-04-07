# JDA AI-Native Platform — Implementation Plan

> Updated April 7, 2026. Step 6 split into **6.a** (portal browse shell and full IA) and **6.b** (measurement dashboards). Earlier updates reflect Steps 2–5 and 9.5 completion; feedback loop validated end-to-end with first DB entry confirmed.

---

## Architecture Overview

The platform is a structured content and knowledge layer that makes Claude operationally intelligent for JDA (and eventually for external organizations). It consists of four components:

**The Portal** — A web app (Azure AD gated, restricted to a small admin group) that manages all platform content: templates, prompt libraries, workflow guides, client brand packages, capabilities matrix, deliverable classification, quality gate definitions. Also houses LOB tools (RFP scraper, proposal generator, etc.) and practice leader dashboards. Most JDA practitioners never touch the portal. It is the management layer, not the practitioner experience.

**The Bridge** — An MCP server exposing the portal's content API so Claude can query it live. Practitioners interact with the platform entirely through Claude via this MCP connection. The MCP server is connected at the Claude Teams organization level; each practitioner authenticates individually via OAuth (Azure AD). Permission tiers control what each user can read or write. This pattern is proven — Flint validates the MCP server architecture, and the Dropbox/Asana connectors validate the OAuth-per-user flow on Claude Teams.

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

The connector is set at the org level — practitioners do not need to reconnect individually. However, reconnection is required whenever **new MCP tools are added** (Claude re-fetches the tool manifest on reconnect). This is a Claude protocol constraint. Content changes (Sanity edits, brand package updates, `platformGuide` text) are live immediately and never require reauth. A practitioner-facing changelog should communicate when a reconnect is needed. See Step 10 for changelog as portal content.

### Key Architecture Principle

The portal is NOT where practitioners go to do their work. Claude is. The portal is the management layer where content is created, organized, and published into Claude's ecosystem. The practitioner experience is: open Claude, and Claude already knows how JDA works — because the platform fed it the context.

LOB tools (RFP scraper, proposal generator, meeting intelligence) are the exception — these are standalone applications that live in the portal because they do things Claude can't do natively.

---

## Verified Tech Stack

| Layer | Technology | Status | Notes |
|---|---|---|---|
| Framework | Next.js (App Router) | **Verified** | Server components, API routes, middleware |
| Language | TypeScript | **Verified** | Strict mode throughout |
| Styling | Tailwind CSS | **Verified** | Custom CSS variables for theming |
| Auth (portal) | Auth.js v5 + Microsoft Entra ID | **Verified** | Azure AD SSO, single-tenant, Object ID as stable user identifier |
| Auth (MCP) | OAuth via Claude Teams connector | **Verified** | Org-level connector setup, per-user OAuth authorization via Azure AD |
| Database | PostgreSQL on Railway | **Verified** | Direct SQL via `postgres` npm package, no ORM |
| Content store | Sanity (self-hosted on Railway) | **Verified** | CMS-shaped content. Sanity Studio provides admin UI. GROQ API serves both portal frontend and MCP server. |
| MCP server | Standalone Node.js service | **Verified** | `@modelcontextprotocol/sdk`, Streamable HTTP transport |
| Hosting | Railway (all services) | **Verified** | Single Railway project, multiple services, shared PostgreSQL. Auto-deploy on push to `main`. |
| Source control | GitHub | **Verified** | CI/CD via Railway auto-deploy |
| Automation | n8n on Railway | Planned | Same Railway project |
| File storage | None (platform stores text; logos stored in Sanity; files live in Dropbox) | **Resolved** | See Storage Architecture below |

---

## Authentication Architecture

### Two Auth Contexts

| Context | Who | How | What It Does |
|---|---|---|---|
| Portal sign-in | Small admin group (Brandon, practice leaders, NewCo team) | Auth.js v5 + Entra ID, direct browser session | Full portal access — content management, dashboards, settings |
| MCP via Claude | All JDA practitioners (~33 people) | OAuth via Claude Teams custom connector, Azure AD | Access platform content through Claude, scoped by permission tier |

### Account Types (as of April 2026 auth model overhaul)

| Account Type | Portal Access | Description |
|---|---|---|
| `owner` | Always (non-toggleable) | One per system. Full permissions everywhere. Can transfer ownership. |
| `admin` | Always (non-toggleable) | Portal admin access. Manage users, roles, permissions. |
| `user` | Toggleable per-user | Standard practitioner. Capabilities determined by assigned roles. |

### Role-Based Permissions

Roles define capability groups with granular `resource:operation` permissions and scope (`all` / `own_practice` / `none`). Multiple roles per user, additive. System roles: `editor`, `practitioner`. User-level overrides (grant/deny) layer on top of role permissions.

**Effective permission resolution:** union of all role permissions + user grants − user denials. Owner bypasses all permission checks. Admin always has portal access regardless of toggles.

### Debug Mode (owner only)

Owner can temporarily impersonate a role's permission set for testing via the Settings page or `alexandria_debug_as_role` / `alexandria_debug_exit` in Claude. Session-based — clears on next login or explicit exit. Amber banner in portal, near-realtime sync (3s poll) between portal and Claude.

### API Keys (Secondary Auth)

Active — used for programmatic access. Claude connector uses OAuth (primary path); API key is a fallback. **TODO: Decide whether to keep, restrict, or remove API keys.** Currently live and functional but not the intended practitioner flow.

---

## Storage Architecture

The platform stores authored intelligence as text in Sanity. Logos are stored directly in Sanity (SVG code or hosted image). Raw asset files live in Dropbox.

| Content | Where It Lives | How the Portal References It |
|---|---|---|
| Template production instructions | Sanity (authored text) | MCP returns instructions as text |
| Client brand voice, tone, messaging | Sanity (authored text) | MCP returns distilled brand context |
| Client logos | Sanity (SVG code field or hosted image field) | MCP returns SVG markup or CDN URL |
| Brand guidelines PDFs | Dropbox (existing) | Sanity stores Dropbox link |
| Workflow guides | Sanity (authored text) | MCP returns workflow steps |
| Deliverable classifications, quality gates, capabilities matrix | Sanity (structured data) | MCP returns structured lookups |
| LOB tool output | Railway disk (ephemeral) → Dropbox (permanent via n8n) | LOB tools generate to Railway, n8n routes to Dropbox |

---

## Build Sequence

### Step 1: Portal Foundation + Proof of Concept — ✅ COMPLETE

**Portal foundation:**
- ✅ Next.js app on Railway with Auth.js v5 + Entra ID
- ✅ Azure AD security groups (Admins, Editors, Users) — group membership is source of truth for permission tiers, enforced on every login
- ✅ PostgreSQL schema for users, api_keys, oauth_sessions
- ✅ Sanity self-hosted on Railway with initial schema
- ✅ Portal navigation shell (Dashboard, Content, Clients, Users, Tools, Settings)
- ✅ Sanity Studio as the admin interface
- ✅ Auth middleware protecting all portal routes
- ✅ Users management page — view all connected users, change tier, set practice

**MCP server:**
- ✅ OAuth via Claude Teams custom connector (PKCE flow, our server acts as auth server)
- ✅ Azure AD group membership checked on every OAuth login
- ✅ Session tokens in PostgreSQL, 90-day expiry
- ✅ API key fallback for programmatic access
- ✅ Permission gating — `systemInstructions`, `visionOfGood`, `tips`, `checkPrompt` restricted to `practice_leader` and `admin`
- ✅ Permission gating validated end-to-end with a real practitioner account

**Content type: Production Methodologies:**
- ✅ Sanity schema with structured fields (steps, qualityChecks, failureModes, systemInstructions, tips, visionOfGood)
- ✅ 4 methodologies seeded: pre-discovery brief, post-discovery brief, client strategy brief, brand package extraction
- ✅ `alexandria_list_methodologies`, `alexandria_get_methodology`, `alexandria_list_practice_areas`, `alexandria_list_deliverables`, `alexandria_whoami`

**Content type: Client Brand Packages:**
- ✅ Sanity schema with structured fields + `rawMarkdown` primary field
- ✅ `logoSvg` and `logoImage` fields added — SVG code preferred, raster image as fallback
- ✅ `alexandria_list_brand_packages`, `alexandria_get_brand_package`, `alexandria_save_brand_package`
- ✅ 11 brand packages loaded: HBI, Biglife, CHM, Conquer, Indy Chamber, Indy Partnership, Kingsworth, Prolific, Spokenote, Venture, WIF

**Validated end-to-end:** HBI post-discovery brief produced on-brand output using real HBI colors and voice pulled from Alexandria.

---

### Step 2: Templates — ⚠ PARTIALLY COMPLETE — Template system needs additional work before production-ready

**Architecture decision:** All HTML deliverable types (scrolling editorial, slideshow, landing page, catalog, RFP response) consolidated into a single `html-deliverable` template with a feature menu (scroll / slide / tabbed layout modes). One template to maintain, infinite combinations. Claude selects the right combination from the practitioner's description — no command words required.

**Status note:** Schema, MCP tools, and intake enforcement are complete. However, end-to-end testing revealed the template system is not yet production-ready — Claude generates HTML structure from scratch rather than from a canonical source, producing inconsistent output. Brand font extraction is unreliable. Brand-specific overrides don't exist yet. These gaps need to be closed before Step 2 is truly complete.

**Template schema + MCP tools:**
- ✅ Sanity schema with six structured production instruction fields (fixedElements, variableElements, brandInjectionRules, clientAdaptationNotes, outputSpec, qualityChecks)
- ✅ `alexandria_list_templates` — list active templates, filter by format type
- ✅ `alexandria_get_template` — full template with production instructions

**Templates loaded:**
- ✅ HTML Deliverable (`html-deliverable`) — covers all HTML formats, active
- ✅ JDA Document Style (`jda-document-style`) — word document, programmatic .docx generation via `docx` npm library, active
- ⬜ Campaign Brief — pending discovery session
- ⬜ Client Proposal — pending discovery session

**Format types (simplified from original plan):**
- `html-deliverable` — all HTML formats
- `word-document` — .docx generation
- `html-email` — branded email templates

**Brand extraction methodology updated:**
- ✅ Website scrape fallback added — when no brand guidelines PDF exists, Claude scrapes homepage, about, services pages and extracts what's available. Gaps documented explicitly. JDA itself can be extracted this way.

**Sanity Studio improvements:**
- ✅ Download as Markdown action — available on all document types, assembles a clean markdown file for pasting into Claude. Smart field handling: SVG inline, nested objects, arrays, enum labels.

**Remaining open items from Step 2:**
- ✅ **Intake enforcement — session-gated flow.** `intake_sessions` table in Postgres, `alexandria_get_template` returns session_id + questions only, `alexandria_submit_intake` validates and completes sessions, `alexandria_build_template` hard-rejects incomplete sessions. Built and deployed.
- ✅ **Canonical entry prompt convention.** Established: *"I need to build an HTML deliverable from Alexandria."* Documented in intake instructions and to be included in `alexandria_help`.
- ✅ **Brand-specific template overrides.** `templateOverrides` text field added to brand package schema and included in MCP response (surfaced first, before brand content).
- ✅ **Web font injection.** `webFonts[]` array added to brand package schema — role, family name, source, ready-to-inject `<link>` tag, CSS stack, web substitute. MCP returns link tags and CSS values ready to paste. Font CDN resolution (Google → Typekit → substitute) to be part of brand extraction methodology.
- ✅ **Logo variants.** `logos[]` array added — multiple variants (primary, reversed, icon, wordmark, etc.) each with onBackground, svgCode, raster fallback, and notes. `logoUsageRules` field tells Claude which variant to use where.
- ⬜ **Canonical HTML source in GitHub (P0).** The `fixedElements` field describes the template in prose — Claude generates CSS architecture and slide engine JS from scratch every time, producing inconsistent and sometimes broken output (backward nav bug in slide mode confirmed). The `githubRawUrl` field exists for a canonical, version-controlled HTML file. Slide engine, CSS custom properties, and component scaffolding must live in the repo and be proven correct before any deliverable uses them.
- ⬜ **Re-extract all existing brand packages (P1).** `logos[]`, `webFonts[]`, `logoUsageRules`, and `templateOverrides` are unpopulated on all 11 existing packages. Re-run through updated extraction methodology with font CDN resolution. Priority: Prolific first, then remaining 10.
- ⬜ `alexandria_save_template` write tool — not yet built. Templates currently loaded via script or Sanity Studio.
- ⬜ Campaign Brief + Client Proposal templates — pending discovery.
- ⬜ `assemble_production_context` — deferred, not needed to validate Step 2.

---

### Step 3: Alexandria Help + Platform Discovery Surface — ✅ COMPLETE

**Spec:** `ref/step-3-alexandria-help-spec.md` — developed in discovery session March 30, 2026.

**What this solves:**
Two failure modes. **Bypass failure** — practitioner builds without Alexandria, output is unsanctioned. **False sanction failure** — practitioner asks Alexandria for something it doesn't have, Claude invents a methodology, practitioner believes it came through an approved channel. `alexandria_help` addresses both: it is simultaneously a discovery surface (what exists) and a coaching tool (how to use it correctly).

**Response style:** Style A (structured inventory) + Style D (intent-driven follow-ups) combined. Structured summary comes first — scannable, scales as content grows. Intent prompts follow as natural next steps.

**MCP tool: `alexandria_help`**

Response structure (in order):
1. What Alexandria is — one or two sentences, authored in Sanity (`platformIntro` field), not hardcoded
2. How to start a production job — canonical entry prompt as first-class instruction: *"I need to build a [deliverable type] from Alexandria."* No client, no content, no layout in the opening prompt.
3. Active methodologies — name, practice area, one-line when-to-use. Listed before templates (methodologies = majority of eventual production volume)
4. Active templates — name, format type, use cases
5. Available brand packages — full client name list
6. Permission-tier addendum — practice_leader and admin only, appended after standard response. Surfaces elevated capabilities (full methodology content, write tools)
7. Intent-driven follow-ups (Style D) — 4 suggested next steps as sendable prompts reflecting what practitioners actually do next

**Trigger:** Intentional only in v1 — fires when practitioner explicitly asks what Alexandria can do. Proactive triggering (Claude detecting unsupported production requests) is deferred — Claude already knows its connected tools and doesn't need a tool call to check its own capabilities. Convention instead: practitioners learn to ask "Can Alexandria do ___?" before asking to produce something Alexandria doesn't have.

**Unsupported request flow:**
> "Alexandria doesn't currently have a methodology or template for this. I'm happy to help — and we should still use what Alexandria does have, including your brand package and quality frameworks, even if the deliverable itself isn't from a sanctioned template. Want me to proceed?"
Not a refusal. Transparent handoff that keeps Alexandria assets in the loop. Every unsupported request logged.

**Sanity schema: `platformGuide` singleton**
- `platformIntro` — one or two sentence description of Alexandria. Authored in Sanity, not hardcoded.
- `canonicalEntryPrompts` — array of entry prompt strings
- `examplePrompts` — array of example prompts for common use cases, all following generic entry pattern. Maintained in Sanity by Brandon/practice leaders.

**Request logging: `alexandria_request_log` table**
Applied to ALL MCP tool calls, not just `alexandria_help`. Columns: `user_id`, `permission_tier`, `tool_name`, `request_summary`, `matched_capability` (bool), `capability_type` (template/methodology/brand_package/null), `capability_id`, `created_at`. Unsupported requests (`matched_capability = false`) are the priority data — primary input for deciding what to build next. Reporting surface deferred to Step 6.b dashboards.

**Build items:**
- ✅ `alexandria_request_log` DB migration
- ✅ Request logging middleware on all MCP tool handlers (get_template, build_template, get_methodology, get_brand_package, help)
- ✅ `platformGuide` Sanity schema (singleton document type)
- ✅ Seed `platformGuide` document (platformIntro, canonicalEntryPrompts, examplePrompts)
- ✅ `alexandria_help` MCP tool — tier-aware, pulls live from Sanity, tier callout as blockquote at top
- ✅ Unsupported request flow — baked into tool description; validated with "social media calendar" test

**Validated:** `alexandria_help` returns structured inventory with tier callout, unsupported request handoff fires correctly, request logging confirmed in Postgres.

**Depends on:** Step 2 intake enforcement complete. `platformGuide` content seeded before `alexandria_help` goes live.

---

### Step 4: Capabilities Matrix — ✅ COMPLETE (with open items)

**Discovery:** `ref/step-4-discovery-and-plan-updates.md` — March 30, 2026. Original Step 4 placeholder (three separate content types) collapsed into one coherent data model.

**What was built:**

*Schema:*
- `capabilityRecord` Sanity document type — 4-stage status pipeline (Not Evaluated → Classified → Methodology Built → Proven Status), AI classification (AI-Led / AI-Assisted / Human-Led), capability assessment fields (AI ceiling, support role, tool stack, live search flag), production time before/after, source tracking
- `productionMethodology` additions — `qualityChecklist` (human handoff gates Claude surfaces post-production as "Before This Goes Downstream"), `baselineProductionTime`, `aiNativeProductionTime`

*Data:*
- 72 capability records seeded across 10 JDA practice areas — extracted from KIRU deliverable inventory, no KIRU references in the data
- JDA practice area taxonomy established: Brand Creative, Campaign and Production Creative, Digital Marketing/Social/Email/Data, Development, Strategic Communications/PR/Crisis Comms, Paid Media and Search, Business Development, Account Services, Operations, Logistics

*MCP tools:*
- ✅ `alexandria_list_capabilities` — browse by practice area, classification, or status
- ✅ `alexandria_get_capability` — full assessment by classification type (AI-Led → methodology link; Human-Led → ceiling assessment + live search supplement)
- ✅ `alexandria_log_capability_gap` — practitioners flag unknown deliverable types, auto-creates stub record in backlog
- ✅ `alexandria_update_capability` *(practice_leader+)* — classify records and update assessments through Claude
- ✅ `alexandria_get_methodology` updated — quality checklist appended as handoff block after every production run
- ✅ `alexandria_help` updated — full 17-tool inventory across 5 categories, live capabilities matrix summary (count, methodology built, proven)

*Portal:*
- ✅ `/capabilities` page — unified flat sortable table, pill filter system (practice × classification × status), stats strip with stacked progress bar, CSV export
- ✅ Added to nav

**Validated:** MCP tools confirmed working. Portal page rendering correctly.

**Open items (human work, not code):**
- ⬜ **Human review of deliverable inventory** — the 72 seeded records came from a proof-of-concept and should be reviewed by practice leaders for accuracy, additions, and removals before Discovery Intensives begin
- ⬜ **Asana history extraction** — pull historical project data from Asana to supplement and validate the deliverable inventory (adds `source: asana_history` records). Likely produces additional records not covered by the KIRU seed.
- ⬜ **Human-Led methodology authoring** — video production, logo production, brand discovery sessions, crisis communications. Content work, not code. Required before Human-Led records can advance to `methodology_built`.
- ⬜ **Discovery Intensives** — the process that moves records from `not_evaluated` to `classified` and beyond. All 72 records are currently `not_evaluated`.
- ⬜ **Define Proven Status threshold** — once Step 9.5 feedback logging ships, establish the minimum feedback count and average quality score required for a record to advance to Proven Status. Suggested starting point: ≥3 feedback entries, average score ≥4.

**Step 6 dependency notes preserved from discovery:** See `ref/step-4-discovery-and-plan-updates.md` Part 3. Step 6.b dashboard data sources are entirely sourced from Step 3 (`alexandria_request_log`) and Step 4 (`capabilityRecord` schema). No new data model needed in Step 6.b. Step 6.a is the portal browse shell (Sanity-backed reads); it does not require new analytics tables.

---

### Step 5: Auth Model + Permissions Infrastructure — ✅ COMPLETE (shipped April 2, 2026)

**Discovery:** `ref/step-5-discovery-and-plan-updates.md` and `ref/step-05b-auth-model-decisions.md`. Original Step 5 placeholder superseded by a full auth model overhaul.

**What was built:** Migrated from a tier-based system to account types + role-based access control (RBAC) with granular permissions. Azure AD group membership now gates authentication only (`Alexandria-Users` is the single gate). All authorization managed inside the app.

**Database schema changes:**
- ✅ `users.tier` → `users.account_type` (`owner` / `admin` / `user`), data backfilled
- ✅ `permissions` table renamed → `role_permissions` with `resource:operation` format and scope
- ✅ `user_permissions` table — per-user grant/deny overrides layered on top of roles
- ✅ `org_config` table — singleton for org-level settings (default role for new users)
- ✅ `oauth_sessions.debug_role_id` column — session-based debug mode state
- ✅ Owner bootstrap — first user to log in becomes owner automatically
- ✅ System roles: `editor`, `practitioner` (practitioner is default for new users)

**MCP:**
- ✅ `checkPermission()` — owner bypasses all checks; debug mode resolves as debug role only; standard users: union of role permissions + user overrides
- ✅ `AuthResult` carries `accountType`, `sessionId`, `debugRoleId`
- ✅ `alexandria_debug_as_role(role_id)` — owner only, sets debug role on all active sessions
- ✅ `alexandria_debug_exit` — clears debug on all active sessions by `user_id` (works via OAuth or API key)
- ✅ `alexandria_whoami` — shows account type, roles, permissions, debug mode status
- ✅ Single Azure AD group (`Alexandria-Users`) as auth gate — simplified from three-group model

**Portal:**
- ✅ `/users` — account type badge with editable dropdown (owner/admin), role assignment, permission override editor (Grant/Inherit/Deny per action), transfer ownership flow
- ✅ `/roles` — All/Own Practice/Off segmented toggle grid per permission (replaces scrollable add-form); clicking active state toggles off; role rename inline
- ✅ `/settings` — Debug Mode section (owner only): pick role, activate/exit; Organization section: default role for new users
- ✅ Debug banner — in-flow (not fixed), amber, shows active debug role, Exit button; shared `DebugContext` keeps banner and Settings in sync; 3-second poll for near-realtime Claude ↔ portal sync
- ✅ `ConfirmModal` component — replaces browser `confirm()` on all destructive actions
- ✅ `DebugProvider` context — single source of truth for debug state, consumed by banner and Settings page

**Auth hardening:**
- ✅ `src/middleware.ts` — route protection, all unauthenticated requests → `/sign-in`
- ✅ Portal layout auth guard (`redirect('/sign-in')` if no session)
- ✅ Sign-out via server action (`signOut()`) — fixes `MissingCSRF` error from raw POST
- ✅ Sign-in error display — `signIn()` callback returning `false` → `AccessDenied` redirect → red error message on `/sign-in`
- ✅ Admin `portal_access` always `TRUE` — enforced in `upsertUser`, migration backfill, and PATCH route
- ✅ Sign-out clears `debug_role_id` on all active MCP sessions
- ✅ `/api/me/debug` and `/api/me` marked `force-dynamic` — prevents Next.js 15 caching stale debug state

**Workflow Guides:** Deferred to Step 10.
**Practice Areas as content type:** Deferred to Step 10.

**Additional items shipped April 2, 2026:**
- ✅ `alexandria_debug_as_role` accepts role slug or UUID — frictionless from Claude (no UUID lookup needed)
- ✅ `alexandria_whoami` includes role UUID in output
- ✅ User deletion — `DELETE /api/users/[id]` with cascade; delete button + confirm modal in users page; blocked on owner and self
- ✅ `prompt: "select_account"` scoped to sign-in action only — shows Microsoft account picker on explicit sign-in, does not loop on callback
- ✅ Debug mode permission enforcement validated end-to-end (tool calls actually blocked, not just reported)
- ✅ `alexandria_debug_exit` from Claude clears portal banner within ~3s (confirmed post caching fix)
- ✅ Transfer ownership tested end-to-end
- ✅ Sign-in error message confirmed working for unauthorized accounts
- ✅ Platform Guide added to Sanity Studio sidebar

**Open items:**
- ✅ Default role change in Settings → new user logs in and receives updated role
- ⬜ Role permission grid (77 permissions on Editor) is functional but unwieldy at scale — UX revisit flagged
- ⬜ API keys: keep/restrict/remove decision pending

**Depends on:** Steps 1–4 complete.

---

### Step 6.a: Portal Browse Experience and Application Shell

**Purpose:** The portal is the full product surface for anyone browsing and using Alexandria as an application. Sanity Studio remains the **editor** for authored content; the portal must **represent the entirety of the platform** — real routes, real data, no mock dashboards, no navigation to missing pages.

**What to build:**

- **Navigation integrity:** Every item in the portal shell (e.g. Dashboard, Content, Clients, Capabilities, Users, Roles, Tools, Settings) resolves to an implemented route. Use explicit placeholder/roadmap copy only where a feature is intentionally not built yet — never silent 404s.
- **Content library:** Browse and detail views for production content in Sanity — methodologies, templates, and related types as they exist in the schema. List, filter, and read in the portal; deep linking to Studio for create/edit/archive workflows.
- **Clients:** Brand packages (and related client-scoped content) — list, detail, Studio links; reuse patterns consistent with MCP-exposed content.
- **Tools:** A real Tools area — entry points to each LOB tool as they ship, or a clear, on-brand empty state with scope described.
- **Home dashboard (first layer):** Replace placeholder widgets with **live** summaries: signed-in user context, counts and highlights from Sanity and Postgres (e.g. users, content inventory), and deep links into library sections. Expand with request-log-driven widgets when queries exist (can align with 6.b visuals later).
- **Portal-native interactions:** Everything that is not authoring in Studio — admin flows, settings, API keys, debug UX, exports/copy actions already in the stack — lives in coherent pages tied to the same layout and IA.

**RBAC:** Respect account types, roles, and permissions for which sections and actions appear (consistent with portal API routes and MCP gating philosophy).

**Open items:**
- Practice areas as a first-class Studio content type remain deferred elsewhere in the plan; until then, practice may appear as taxonomy/filters on capabilities and content, not necessarily a dedicated “Practices” CMS section.

**Depends on:** Steps 1–5 complete. Steps 3–4 complete for meaningful content and capability inventory to display.

---

### Step 6.b: Measurement and Dashboard Layer

**Purpose:** Wire up the **measurement and transformation reporting** layer. This is primarily visualization and aggregation on data models from Steps 3, 4, and 9.5 — **do not invent a new data model here** except as thin presentation/query layers.

**Data available by the time Step 6.b is built:**
- `alexandria_request_log` (Step 3) — all MCP activity, by user, tool, practice
- `capabilityRecord` (Step 4) — full deliverable taxonomy with status, classification, proven status, production time data
- `capability_gap_log` via `alexandria_log_capability_gap` (Step 4) — unsupported requests and unidentified deliverable types
- `production_feedback` (Step 9.5) — practitioner quality scores and observations per output; average score and feedback count per capability record

**Build:**
- Executive dashboard (Chance): transformation progress — workflows identified, classification coverage, proven status progression, practice-by-practice breakdown. Sourced from Capability Records.
- Practice leader dashboard: their practice slice of the Capabilities Matrix + MCP usage data for their team
- Admin dashboard (Brandon): full platform view — all of the above + request log volume, unsupported request patterns, capability gap trends
- Portal surfaces for **feedback and quality signals** tied to capability records (e.g. counts, recent observations) where Step 9.5 defers presentation to the portal — implemented as part of or alongside these dashboards
- n8n: background data routing as needed. First workflow TBD based on what's actually needed.

**Primary metrics (defined in Step 4 discovery):**
- Production time reduction by deliverable type (before/after from Capability Records)
- Proven Status progression (% of JDA's production surface area validated AI-native)

**Secondary metrics:**
- MCP usage volume by practice and practitioner (leading indicator of adoption)
- Classification coverage (% of identified workflows evaluated)
- Revision rate comparison (requires manual input — likely deferred)

**Executive metrics (Chance):**
- Blended production time reduction across agency (target: 50% at 6 months)
- Proven Status count and practice distribution
- Revenue pipeline implications (requires BD input — manual at first)

**Open questions (still to resolve before building):**
- Is Asana API integration worth building for adoption tracking, or is MCP request log sufficient?
- What does the first n8n workflow actually look like?
- Does the practice leader dashboard need write capability (log production time, mark proven status) or is it read-only?

**Depends on:** Steps 3 and 4 complete. Step 6.a complete so dashboards sit inside a **real application shell** (navigation, layout, RBAC), not mock pages. Capability Records seeded and partially evaluated through at least two Discovery Intensives (for meaningful executive narrative — early 6.b prototypes can still use current seed data).

---

### Step 7: Claude Project Architecture — ✅ RESOLVED THROUGH DISCOVERY. NO ACTION REQUIRED.

This step was written before MCP was proven and before the platform had real content. The assumptions have changed significantly.

**What the original plan assumed:**
- Significant uncertainty about how Projects + MCP work together
- A complex setup process requiring a wizard
- Content needing to live in Project system prompts

**What's actually true now:**
- MCP is proven. Projects + MCP works. The real question is content strategy, not technical feasibility.
- The platform has real content. The question is what belongs in a Project system prompt vs. what gets pulled live via MCP.
- Practitioner onboarding might be much simpler than anticipated.

**Questions to resolve in discovery:**
- What is the right Project structure — per-practice, per-client, or both?
- What content belongs in a Project system prompt vs. a Skill vs. MCP on-demand? (Three buckets now, not two — see Step 8.5)
- What does a practitioner's day-one experience look like?
- How do Projects get updated when platform content changes?
- Who manages Projects — Brandon, practice leaders, or self-serve?
- Does a "Setup Wizard" still make sense, or is Project setup simple enough to do manually?

**Note:** Step 8.5 (Claude Skills Strategy) is a direct input to this discovery. The three-layer model (built-in / org-provisioned / personal) changes what needs to live in a Project system prompt. Content that can be delivered as an org skill doesn't need to be in the Project at all. Resolve Skills strategy before finalizing Project architecture.

**Depends on:** Having enough content in Alexandria to actually test with. Steps 1–3 are sufficient to start this discovery.

---

### Step 8: LOB Tools — ⏭ SKIP

Build the first standalone tool modules in the portal.

**Priority candidates:**
- RFP scraper/finder (was "in progress" — current status unknown)
- Proposal generator
- Meeting intelligence pipeline (Fireflies → structured summaries)
- Client onboarding playbook builder

**Open questions:**
- Where does the RFP scraper actually stand?
- Which tool has the highest immediate value to practitioners?
- Do LOB tools need n8n, or can some be built as simple Claude API calls in the portal?
- What's the file routing story — is n8n to Dropbox still the right path?

**Depends on:** Specific tool requirements from practice activations. n8n setup for file routing tools.

---

### Step 8.5: Extending Claude — Full Discovery Required

**Status:** NOT STARTED. The previous version of this step was written before Anthropic shipped plugins, desktop extensions, the unified directory, skill sharing, and enterprise governance controls for most of these surfaces. The assumptions in the prior version are outdated. This step needs a full discovery session built from current Anthropic documentation and product surfaces, not from prior assumptions.

**What this step covers:** A deliberate strategy for how JDA configures, governs, and trains practitioners on the four mechanisms for extending Claude's capabilities. Each has its own admin surface, governance model, distribution mechanism, and security profile. All four need to be evaluated before the May 11 launch.

**The four extension mechanisms (as of April 2026):**

| Mechanism | What it is | Where it runs | Org governance |
|---|---|---|---|
| **Skills** | SKILL.md instruction packages that teach Claude procedural knowledge for specific tasks. Load dynamically when relevant. | Chat, Cowork, Claude Code, API | Org-provisionable by admin (enabled or disabled by default). Peer sharing and org-wide sharing toggleable independently. Partner directory (Notion, Figma, Atlassian, Canva, etc.). |
| **Connectors** | Cloud-hosted remote MCP servers. OAuth-authenticated. | claude.ai, desktop app, Claude Code | Configured at org level or individually. This is where Alexandria lives alongside M365, Slack, Google, Fireflies, etc. 50+ in the directory. |
| **Extensions** | Locally-installed MCP servers packaged as .MCPB files (formerly .DXT). Run on the practitioner's machine with full system privileges. One-click install. | Desktop app only | Enterprise allowlists, blocklists, private extension distribution. Security implications: extensions run unsandboxed with full host system access. |
| **Plugins** | Bundles that package skills, slash commands, agents, and MCP servers into a single installable unit. | Cowork, Claude Code | Private marketplaces, per-team provisioning, auto-install. Marketplace launched February 2026. |

**How Alexandria fits:** Alexandria is a Connector (cloud-hosted MCP server, org-level config, per-user OAuth). It carries live production content: methodologies, brand packages, templates, capabilities matrix, quality checklists. Skills carry persistent behavioral instructions (JDA voice, writing standards, meeting note format). The two are complementary. Extensions and Plugins are additional surfaces that may or may not be relevant to JDA's practitioner experience at launch.

**What the prior version got right (preserve these ideas):**

- The distinction between org-provisioned skills and personal skills is valid and confirmed by current product behavior
- The candidate org skills (JDA brand voice, meeting note structure, client brief format, quality gate reminders) are still good candidates
- The framing "a skill is a standing brief" is accurate for training
- Alexandria and Skills are complementary, not redundant
- The `alexandria_get_skill` MCP tool concept (session-seeded skills) is still viable but should be evaluated against the native skill sharing features Anthropic has since shipped

**What the prior version got wrong or missed:**

- Assumed Skills were the only extension mechanism. Plugins, Extensions, and the unified directory did not exist when this was written
- Did not account for skill sharing (peer-to-peer or org-wide publishing), which changes the distribution model
- Did not account for the partner skills directory, which may provide ready-made skills JDA should deploy immediately
- No mention of desktop extensions or their security implications (unsandboxed, full system privileges, enterprise allowlist/blocklist controls)
- No mention of plugins as bundled packages of skills + commands + agents
- The three-layer model (built-in / org-provisioned / personal) was accurate for Skills but is not a complete picture of the extension landscape

**Discovery questions (all open, do not assume answers):**

*Skills:*
- Which org-provisioned skills should ship at launch? JDA brand voice and writing standards are the obvious candidates, but validate against current product behavior
- Should skill sharing be enabled org-wide, restricted to admin-provisioned only, or somewhere in between? What's the governance posture?
- Are there partner skills in the directory (Notion, Figma, Atlassian, Canva) that JDA should deploy to practitioners on day one?
- Does the `alexandria_get_skill` tool still make sense given that Anthropic now supports native skill sharing and org directory publishing?
- How do org skills stay current when JDA's brand or processes evolve?

*Connectors:*
- Connector strategy is largely resolved (Alexandria + the standard set from training Session 1). Any gaps?
- Is there anything in the 50+ connector directory that JDA should evaluate?

*Extensions:*
- Does JDA need desktop extensions at launch, or are Connectors sufficient?
- What is the security evaluation and approval process before any extension gets allowlisted?
- Which of the Anthropic-built extensions (PowerPoint, Word, PDF, Filesystem, Control Chrome, Control Mac) should be enabled org-wide vs. left to individual practitioners?
- Does the Figma extension change the existing Figma MCP workflow?

*Plugins:*
- Are plugins relevant to JDA at launch, or is this a post-launch evaluation?
- Is there value in building a JDA plugin that bundles Alexandria skills + connector configuration?
- Does the private marketplace feature have a use case for JDA/Prolific?

*Cross-cutting:*
- What do practitioners need to know about each mechanism in training? The training doc currently mentions Skills and Connectors but not Extensions or Plugins
- How does each mechanism interact with Projects (resolved in Step 7 as optional, practitioner-managed collaboration spaces)?
- What is the admin configuration checklist before May 11? Each mechanism has its own org-level toggles and controls

**Discovery method:** Work through each mechanism using current Anthropic documentation (support.claude.com, claude.com/skills, claude.com/connectors, the desktop app Extensions settings, Claude Code plugin docs). Do not rely on the prior version of this step or on AI-generated summaries. Verify everything against the actual product.

**Depends on:** Step 7 resolved (Claude Project Architecture — confirmed: Chat + Alexandria MCP + org skills is the primary practitioner experience, Projects are optional collaboration spaces). Can begin immediately. Skills Workstream 1 (org skill authoring) can begin without code. Extensions and Plugins evaluation is independent of Alexandria build work.

---

### Step 9: Claude Project Setup Wizard — LIKELY OBSOLETE OR MUCH SMALLER

Originally designed to generate everything needed to stand up a new Claude Project. May be unnecessary if Project setup is simple, or may be repurposed as a content package generator (assembles the right Alexandria content into a format ready to paste into a Project system prompt).

**Depends on:** Outcomes of Step 7 discovery.

---

### Step 9.5: Production Feedback Loop — ✅ COMPLETE (shipped April 2, 2026)

**What this is:** A lightweight structured feedback mechanism that runs after every methodology or template output. The practitioner says "rate this" when ready — Alexandria walks them through five structured questions, logs the answers, and confirms. Feedback is stored in the DB and surfaced in the portal. This is the primary data source for advancing capability records to Proven Status.

**Why this matters:** The platform has no signal on output quality. Request logs tell us what tools were called. The capabilities matrix tells us what we believe is possible. Neither tells us whether the actual output was good. Without practitioner feedback, "Proven Status" is a label we assign ourselves. With it, it's backed by logged, attributed practitioner validation.

**What feedback is NOT:** Not an edit request. Not a revision workflow. Not a gate. Structured qualitative observation logged to Alexandria for practice leaders and Brandon to act on through content updates.

**Flow (as built):**
1. Practitioner asks Alexandria to build something
2. Alexandria delivers the output
3. If the methodology or template has `includeFeedbackPrompt` checked, the MCP injects the verbatim prompt text (from `platformGuide.feedbackPrompt`) directly into the **last step's instructions** at render time — not appended as a footer. For methodologies, injected into the last step. For templates, injected as a `### Final Step` section after quality checks. This ensures Claude encounters the instruction inside the active execution sequence, not after it has already closed its response.
4. Practitioner says "Alexandria, give feedback"
5. Claude calls `alexandria_give_feedback(content_type, content_slug)` — server creates a `feedback_sessions` record and returns the five questions formatted as a poll with interactive widget instruction
6. Claude presents all five questions as a poll (same pattern as HTML template intake questions), collects all answers
7. Claude calls `alexandria_log_feedback(session_id, answers)` — server validates the session exists and isn't already complete, inserts to `production_feedback`, marks session complete, confirms logged

**`includeFeedbackPrompt` flag:** Boolean on `productionMethodology` and `template` schemas. When checked, MCP fetches `platformGuide.feedbackPrompt` and appends it as the final section. Checked on all four current methodologies. Templates opt in per-template in Sanity Studio.

**`platformGuide.feedbackPrompt`:** Single source of truth for the rate prompt text. Editable in Sanity Studio → Platform Guide. Current text: *"Rate this Alexandria Tool — Your rating tells the practice team what to improve in Alexandria's instructions, not this conversation. Say 'rate this' and I'll walk you through five quick questions. Takes 30 seconds."*

**Approval gates removed:** All four methodologies had approval gates removed. Claude delivers output and stops — no competing closing question before the Final Step block.

**Structured questions (verbatim poll, baked into tool description — Claude presents all options, collects all answers before logging):**
1. "How much editing did this output need before it was client-ready? A) None, it was ready to send after human review  B) Light editing  C) Moderate editing  D) Heavy editing (essentially started over)"
2. "Where did the methodology fall short? Select all that apply. A) It didn't, output was solid  B) Content structure or organization  C) Strategic depth or accuracy  D) Brand voice or tone  E) Visual formatting or layout  F) Missing context it should have had"
3. "Did the intake questions capture what you needed for this deliverable? A) Yes, they covered the right ground  B) Mostly, but missed something important  C) No, I had to add significant context manually"
4. "Would you use this methodology again for the same deliverable type? A) Yes, confidently  B) Yes, with minor adjustments  C) Only if it's improved  D) No, I'd rather build it manually"
5. "Anything else we should know? A) No, that's everything  B) Other — type below" (optional open text)

Claude collects all answers first, then calls `alexandria_log_feedback` once with the complete set.

**MCP tool: `alexandria_give_feedback`** (phase 1)

Inputs:
- `content_type` — `"methodology"` or `"template"`
- `content_slug` — slug of what was just run

Returns: `session_id` + five poll questions verbatim. Claude presents all questions with poll widget instruction before proceeding.

**MCP tool: `alexandria_log_feedback`** (phase 2)

Inputs:
- `session_id` — from `alexandria_give_feedback` (required — server hard-rejects without valid session)
- `editing_needed` — enum A/B/C/D (Q1)
- `shortfalls` — array of A/B/C/D/E/F (Q2, multi-select)
- `intake_adequate` — enum A/B/C (Q3)
- `would_use_again` — enum A/B/C/D (Q4)
- `observation` — freetext if Q5 "Other" or additional notes (optional)

Logged automatically:
- `user_id` (from session), `content_type`, `content_slug`, `created_at`

**Database tables:**

`feedback_sessions` — tracks in-progress feedback requests (session_id, content_type, content_slug, user_id, status, created_at). Same pattern as `intake_sessions`.

`production_feedback`
```sql
CREATE TABLE production_feedback (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type     TEXT NOT NULL CHECK (content_type IN ('methodology', 'template')),
  content_slug     TEXT NOT NULL,
  editing_needed   TEXT,
  shortfalls       TEXT[],
  intake_adequate  TEXT,
  would_use_again  TEXT,
  observation      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX production_feedback_content_idx ON production_feedback(content_type, content_slug);
CREATE INDEX production_feedback_user_idx ON production_feedback(user_id);
```

**Portal surface (Steps 6.a–6.b):**
- **6.a:** Capabilities and related pages remain the operational browse surface; extend as needed for readable context alongside Studio.
- **6.b:** Feedback count and average score per capability record on the Capabilities page (and/or admin views); most recent observations visible to practice leaders (their practice) and admins (all); feed into executive and admin dashboards as quality signal alongside request volume

**Connection to Proven Status:** Suggested threshold: ≥3 feedback entries, `editing_needed` majority A or B, `would_use_again` majority A or B. Exact threshold TBD — defined when Step 6.b dashboards are built.

**Access:** All roles. Practitioners and practice leaders both log feedback. Admins see all feedback in the portal.

**Depends on:** Steps 1–5 complete.

---

### Step 10: Content Expansion from Discovery

Ongoing — as practice leader discoveries happen, new content flows into Sanity through the portal or through Claude (practice leader write-back via MCP).

**Changelog as portal content (not urgent):** When new MCP tools are added, practitioners need to know to reconnect their Alexandria connector in Claude. A lightweight changelog — authored in Sanity, surfaced as a page in the portal and optionally via `alexandria_help` — would communicate this without requiring a Slack message from Brandon. Add a `changelogEntry` array to `platformGuide` (date, summary, requires_reauth bool) and surface it in the portal. Low priority, but the right home for it.

**No end date. Depends on:** Practice leader alignment meetings and discovery interviews.

---

### Step 11: Initial Launch

The platform is live with real content across all content types. MCP bridge working with OAuth. At least one or two LOB tools functional. A practitioner can sit in Claude and operate AI-native using platform-managed content.

---

## Security Model & Known Gaps

### Layers of Protection (as built)

| Layer | What it does | Status |
|---|---|---|
| Azure AD tenant restriction | Only accounts in the JDA tenant can authenticate at all | Live |
| `Alexandria-Users` group gate | Non-members get `AccessDenied` and see error message on `/sign-in` | Live |
| Portal auth middleware (`src/middleware.ts`) | All routes require active session — unauthenticated → `/sign-in` | Live |
| Portal layout guard | Defense-in-depth redirect if session missing past middleware | Live |
| Portal admin-only API routes | `/api/users` and `/api/roles` require `account_type IN ('owner', 'admin')` | Live |
| Owner guard on user mutations | Cannot modify or demote an `owner` account via `/api/users/[id]` | Live |
| MCP OAuth session tokens | Every MCP request requires a valid bearer token | Live |
| MCP permission gating | All tool access resolved via `checkPermission()` — role-based, with user overrides | Live |
| MCP API key fallback | Secondary auth for programmatic access (debug mode does not apply to API key sessions) | Live |
| Debug mode scoped to owner | `alexandria_debug_as_role` / `alexandria_debug_exit` reject non-owner accounts | Live |

### Known Gaps

1. **MCP pending flow state is in-memory** — a server restart during OAuth drops the flow. Low risk on single-replica Railway. Long-term: move to PostgreSQL.
2. **No MCP request rate limiting** — should be added before public rollout.
3. **API keys: unresolved decision** — keys exist and work. Original intent was n8n/programmatic use. No current users of API key path. Needs keep/restrict/remove decision before team rollout.

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
- ✅ While in debug mode as Practitioner, attempt a tool Practitioner doesn't have — confirm it is blocked, not just reported as blocked in `whoami`
- [ ] Confirm `alexandria_whoami` via API key shows real owner permissions, ignores any active debug session

---

## Open Discovery Questions — For Next Session in Claude

The following questions need to be worked through before committing to the build sequence for Steps 3–8. These should be the basis of a discovery session.

### Claude Project Architecture (Step 7 — highest priority to resolve)

The original plan deferred this behind portal and dashboard work (now **Steps 6.a–6.b**), but the decisions affect MCP and content strategy broadly. **Step 7 is resolved through discovery** — see Step 7 above. What belongs in a Project system prompt vs. MCP vs Skills (Step 8.5) still informs how much content lives in Sanity vs. elsewhere.

- What is the right Project structure? Options:
  - One Project per practice area (Brand, Digital, PR, etc.)
  - One Project per client (HBI, Prolific, Conquer, etc.)
  - Both — practice Projects for methodology, client Projects for deliverables
  - One universal Project that uses MCP to scope everything dynamically
- What belongs in a Project system prompt vs. pulled live via MCP?
  - System prompt candidates: JDA identity, practitioner role context, practice area overview, standing operating procedures
  - MCP candidates: client brand packages, specific templates, methodology instructions, quality gates
  - The answer affects how much content needs to be in Sanity vs. in Project instructions
- How does a practitioner get set up? Is there a self-serve process or does Brandon configure each one?
- How do Projects stay current when Alexandria content changes? MCP solves this for live lookups — but system prompt content goes stale.
- Is there a meaningful difference between a "practice Project" and a "client Project" or does MCP make that distinction irrelevant?

### Alexandria Help + Discovery Surface (Step 3) — ✅ Resolved

Built and validated. See Step 3 above.

### Deliverable Classifications + Quality Gates (Step 4) — ✅ Resolved

Resolved in discovery. Deliverable classifications are a field on `capabilityRecord`, not a standalone type. Quality gates are `qualityChecklist` on methodologies — human-executed handoff prompts, not autonomous Claude gates. See Step 4 above.

### Workflow Guides (Step 5)

- How different are workflow guides across practices? If they're very similar, one schema fits all. If they're practice-specific, they might belong in Project system prompts rather than MCP.
- Who authors these — Brandon, practice leaders, or both?
- What does a practitioner actually do with a workflow guide in Claude? Does Claude walk them through it step by step, or is it reference material?

### LOB Tools (Step 8)

- Where does the RFP scraper stand — is it a real thing or still conceptual?
- Which tool would practitioners actually use today if it existed?
- Do LOB tools need to live in the portal or could they be standalone Claude Projects with the right MCP tools?

### Measurement (Step 6.b)

- What does "adoption" mean concretely? Is it MCP call volume, deliverable count, something else?
- Who looks at dashboards — Brandon, practice leaders, or both?
- What's the minimum dashboard that would actually change behavior vs. be a vanity metric?

### `alexandria_save_template` Write Tool

- Should practice leaders be able to create and update templates through Claude, or is that an admin-only action?
- If yes, what's the review/approval process before a new template is active?

---

*Updated April 7, 2026. Steps 1–5 and 9.5 complete. Step 6 split into **6.a** (portal browse shell and full IA) then **6.b** (measurement dashboards); both pending. Steps 7–9, 10, 11 pending (Step 7 resolved through discovery — no build). Step 4 has open human-work items (data review, Asana extraction, Discovery Intensives). Step 5 open item: API key decision. Step 9.5 open item: portal feedback presentation deferred to Steps 6.a–6.b. Feedback loop validated end-to-end — first production_feedback record confirmed in DB.*
