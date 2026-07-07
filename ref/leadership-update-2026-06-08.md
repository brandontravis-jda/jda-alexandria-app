# Alexandria Platform — Build Session Summary (June 4, 2026)

> 8 commits, 183 files changed, 12,448 lines added, 23,708 lines removed

---

## 1. Portal Access Model — Complete Rebuild

Replaced the broken `portal_access` boolean + fragmented RBAC system with a single hierarchical tier:

| Tier | What they see |
|------|--------------|
| `none` | Redirected to an informational page explaining what Alexandria is and how to access it via Claude |
| `viewer` | Dashboard, all content (read-only), capabilities matrix, client brand packages |
| `editor` | Everything viewers see + ability to create, edit, and delete content |
| `leadership` | Everything editors see + performance analytics dashboard |
| `admin` | Full platform access + Admin Panel (users, roles, practices, audit log, settings) |

- Tier changes take effect on the user's next page load — no sign-out/sign-in required
- All 14 portal API routes updated to enforce tier checks server-side
- All content pages enforce tier client-side (viewers see no create/edit/delete buttons; editors see full UI)

---

## 2. Admin Panel — Separated from Main App

Admin functionality moved out of the main navigation into a dedicated `/admin` section accessed from a profile dropdown menu (top-right avatar).

**Main navigation** (all users): Dashboard, Capabilities, Content, Clients, Tools

**Admin panel** (admin tier only, via profile dropdown):
- **Users** — search, column sorting, filter chips (by tier, MCP status), bulk tier assignment, expandable row detail with role and practice management, AD sync trigger, MCP session revocation
- **Roles** — CRUD for roles with permission grid (All / Own Practice / Off per action)
- **Practices** — CRUD for practice areas with member counts
- **Audit Log** — chronological log of all admin and content mutations
- **Settings** — API keys, debug mode (owner only), org defaults

---

## 3. Sanity CMS — Fully Removed

Migrated the entire content layer from Sanity to Postgres and removed every trace of Sanity from the codebase.

**Content migrated:**

| Content Type | Count |
|-------------|-------|
| Practice areas | 8 |
| Production methodologies | 4 |
| Templates | 3 |
| Client brand packages | 16 |
| Capability records | 79 |
| Deliverable classifications | 0 (table created, no Sanity data) |
| Platform guide | 1 |

**8 new Postgres content tables created:** `methodologies`, `templates`, `brand_packages`, `capability_records`, `deliverable_classifications`, `platform_guide`, `template_practices`, `template_methodologies`

**Removed:**
- Sanity Studio (`/studio` route)
- All 18 `src/sanity/` files (schemas, client, queries, Studio config, actions)
- 6 npm dependencies (`sanity`, `next-sanity`, `@sanity/dashboard`, `@sanity/image-url`, `@sanity/vision`, `@portabletext/react`)
- All legacy marketing components (PageBuilder, SanityImage, PortableText, 12 module components)
- Sanity CDN from `next.config.ts`, Studio bypass from middleware, Studio disallow from `robots.txt`
- Net: **-16,287 lines of dead code**

---

## 4. Content CRUD — New Portal Editor UIs

Built complete create/read/update/delete interfaces for all content types, replacing Sanity Studio as the editing surface.

**12 new API routes:**

| Route | Purpose |
|-------|---------|
| `GET/POST /api/content/methodologies` | List and create methodologies |
| `GET/PATCH/DELETE /api/content/methodologies/[id]` | Read, update, delete a methodology |
| `GET/POST /api/content/templates` | List and create templates |
| `GET/PATCH/DELETE /api/content/templates/[id]` | Read, update, delete a template |
| `GET/POST /api/content/brand-packages` | List and create brand packages |
| `GET/PATCH/DELETE /api/content/brand-packages/[id]` | Read, update, delete a brand package |
| `GET/POST /api/content/capabilities` | List and create capability records |
| `GET/PATCH/DELETE /api/content/capabilities/[id]` | Read, update, delete a capability record |
| `GET/POST /api/content/deliverables` | List and create deliverable classifications |
| `GET/PATCH/DELETE /api/content/deliverables/[id]` | Read, update, delete a deliverable |
| `GET/PATCH /api/content/platform-guide` | Read and update the platform guide |
| `GET /api/content/analytics` | Leadership dashboard aggregates |

**9 new portal pages:**

| Page | Features |
|------|----------|
| `/content` | Hub with live counts and links to all content sections |
| `/content/methodologies` | List with search, create form (editor+) |
| `/content/methodologies/[id]` | Full editor: steps, quality checks, inputs, system instructions, all fields |
| `/content/templates` | List with search, create form (editor+) |
| `/content/templates/[id]` | Full editor: format type, production instructions, practice/methodology links |
| `/content/deliverables` | List with inline create and edit (editor+) |
| `/content/platform-guide` | Editor for platform intro, canonical prompts, feedback prompt, examples |
| `/clients` | Brand package list with search, create form (editor+) |
| `/clients/[id]` | Full editor: identity, color palette, typography, web fonts, voice & tone, brand architecture, visual direction, key messaging |

All editor pages: viewers see read-only content with a "Read-only" badge; editors and above see full create/edit/delete controls.

---

## 5. MCP Server — Migrated from Sanity to Postgres

All 22 MCP tool handlers now read/write directly to Postgres. The MCP server has zero Sanity dependencies.

**Complete MCP tool inventory (all on Postgres):**

| Tool | What it does |
|------|-------------|
| `alexandria_list_methodologies` | Browse methodologies, optional practice filter |
| `alexandria_get_methodology` | Full methodology with steps, instructions, quality checks |
| `alexandria_save_methodology` | Create or update a methodology via Claude |
| `alexandria_list_templates` | Browse active templates |
| `alexandria_get_template` | Full template with intake session initiation |
| `alexandria_submit_intake` | Complete intake questions for a template session |
| `alexandria_build_template` | Execute template production (requires completed intake) |
| `alexandria_list_brand_packages` | Browse all client brand packages |
| `alexandria_get_brand_package` | Full brand package (identity, colors, typography, voice, messaging) |
| `alexandria_save_brand_package` | Create or update a brand package via Claude |
| `alexandria_list_practice_areas` | Browse practice areas |
| `alexandria_list_deliverables` | Browse deliverable classifications |
| `alexandria_list_capabilities` | Browse capability records with filters (practice, classification, status) |
| `alexandria_get_capability` | Full capability assessment |
| `alexandria_update_capability` | Classify or update a capability record |
| `alexandria_log_capability_gap` | Flag an unknown deliverable type |
| `alexandria_help` | Platform discovery surface — inventory, entry prompts, tier info |
| `alexandria_whoami` | Current user, roles, permissions, debug status |
| `alexandria_give_feedback` | Start a structured feedback session |
| `alexandria_log_feedback` | Submit feedback answers |
| `alexandria_debug_as_role` | Owner-only: impersonate a role's permissions |
| `alexandria_debug_exit` | Owner-only: exit debug mode |

**Also changed:**
- Removed `@sanity/client` from MCP `package.json`
- Removed all practice-based content gating (`own_practice` scope) — practices are now organizational metadata for reporting only, not access control
- All tool calls continue to be logged to `alexandria_request_log`

---

## 6. Leadership Dashboard

Built a performance analytics page at `/tools` (leadership tier and above).

**Metrics displayed:**
- Total MCP calls, active MCP users, MCP-enabled users, total platform users
- Tool usage breakdown (which tools are called most)
- Usage by practice area
- Top users by MCP activity
- Most-used methodologies and brand packages
- Recent activity feed
- Configurable time period (7 / 30 / 90 days)

Data sourced from `alexandria_request_log` and `users` tables.

---

## 7. Dashboard — Migrated to Postgres

The main portal dashboard (`/`) previously made 3 live Sanity API calls. Now fully Postgres-backed:
- Content counts from `methodologies`, `templates`, `brand_packages`, `capability_records` tables
- Recently updated content via `UNION ALL` across content tables, ordered by `updated_at`
- Practice areas from `practices` table with activation status
- User count and recent sign-ins from `users` table

---

## 8. Capabilities Matrix — Migrated to Postgres

The `/capabilities` page and `/api/capabilities` route previously used Sanity GROQ queries. Now fully Postgres-backed:
- Joins `capability_records` → `practices` → `methodologies`
- Practice filter pills derived dynamically from data (removed hardcoded list)
- Stats strip, progress bar, CSV export all still functional
- No practice-based scoping — all users see all records

---

## 9. Security & Operations

**Session expiry:**
- Portal: 90-day `maxAge` with daily refresh added to NextAuth config
- MCP: 90-day sliding expiry already existed (confirmed working)

**Audit logging added to:**
- Portal sign-in (via Azure AD)
- API key create and revoke
- Ownership transfer
- All content create/update/delete operations (already existed)
- User edits, role changes, practice assignments (already existed)
- AD sync events (already existed)

**Proactive AD sync:**
- `POST /api/admin/sync-users` pulls all members from the `Alexandria-Users` Azure AD group
- Creates users who haven't logged in yet, updates email/name, soft-disables users who left the group
- Cron-ready (accepts `CRON_SECRET` bearer token)

**Tier cache fix:**
- Added `noStore()` to portal layout so tier changes take effect on the user's next page navigation, not after sign-out

---

## What Remains

### Code work
- **Step 2 open items:** Canonical HTML template source in GitHub (P0); `alexandria_save_template` write tool
- **Step 6.b:** Executive dashboard (transformation progress for Chance), practice leader dashboard, feedback/quality signals on capabilities page, capability gap trend reporting
- **Security checklist:** 6 of 11 pre-rollout items unchecked; MCP rate limiting not implemented; API key keep/restrict/remove decision open
- **Implementation plan refresh:** `ref/portal-implementation-plan.md` still references Sanity and the old auth model

### Human work (not code)
- Human review of 79 capability records by practice leaders
- Asana history extraction to supplement deliverable inventory
- Human-Led methodology authoring (video, logo, brand discovery, crisis comms)
- Discovery Intensives to advance records from `not_evaluated`
- Define Proven Status threshold
- Re-extract all 16 brand packages with full logo/font/override fields populated
- Campaign Brief and Client Proposal template discovery
- Step 8.5: Claude Skills/Extensions/Plugins strategy

### Deferred (low priority)
- API key expiry (keys live until manually deleted)
- Automated cron trigger for AD sync
- `user_permissions` override UI in admin panel
