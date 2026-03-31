# Step 5 Discovery Output + Plan Updates

> Discovery session completed March 30, 2026. This document contains:
> 1. The updated Step 5 spec — ready to build (Workstream A: Permissions Infrastructure)
> 2. What Step 5 defers and why (Workstream B: Workflow Guides)
> 3. Downstream plan notes

---

## Critical Context for Cursor: Current Auth Architecture

Before writing a single line of code, read and understand this. The current system has a
specific coupling between Azure AD and capability gating that must be unwound before the
permissions matrix can be built.

**The current flow (as confirmed by codebase audit):**

1. On every MCP OAuth login, the server calls Microsoft Graph to fetch the user's Azure AD
   group memberships
2. `tierFromGroups()` maps those group IDs → `admin`, `practice_leader`, or `practitioner`
3. That derived tier is written to Postgres via `upsertUser()` — overwriting whatever was
   there before
4. `requireAuth()` fetches from Postgres and uses the stored tier for capability decisions —
   but that value was just overwritten from Azure seconds ago

The comment in the code is explicit (line 29–30 of the MCP middleware):
*"Group membership is the source of truth for permission tiers. Checked on every OAuth
login — database tier is always overwritten."*

**The practical implication:** `users.tier` in Postgres is a mirror/cache of Azure group
membership, not an independent source of truth. Any capability decision made against
`users.tier` is actually being made against Azure group membership, because they are always
in sync. Auth and capabilities are fully coupled.

**What this build must do:** Decouple them. Azure AD handles authentication (can you get in).
The platform permissions matrix handles capabilities (what can you do). These must become
independent systems.

---

## Critical: Lessons from the Failed Step 5 Attempt (March 31, 2026)

Step 5 was attempted and broke the Alexandria MCP connector for several hours. Read this before writing a single line of code.

**What went wrong:**
1. The initial commit swapped Azure group IDs — GROUP_ADMINS was assigned the Owners UUID, GROUP_EDITORS was assigned the Admins UUID. Required a follow-up fix commit.
2. The `/authorize` redirect to Microsoft was missing `GroupMember.Read.All` in the scope. The token exchange had it, the redirect didn't. This caused every user to be rejected as unauthorized. Not caught before deploy.
3. A `WWW-Authenticate` header was added to the 401 response as a supposed fix. This broke the Claude Desktop OAuth popup entirely — it opens blank and never reaches the Microsoft login page. Required a revert.
4. All of the above was deployed to production (`main` → Railway auto-deploy) before end-to-end validation. The connector was broken in production for hours.
5. The root cause of the blank popup — missing OAuth Client ID in the Claude Desktop connector config — was not identified until after all of the above debugging. The OAuth Client ID must be entered in the Claude Desktop connector setup (value: `AZURE_CLIENT_ID` from Railway MCP service variables).

**Rules for this implementation — non-negotiable:**

1. **Do not push to `main` until end-to-end validation passes.** Work on a feature branch. Deploy to Railway from the branch only when the full Step 7 validation checklist is complete.
2. **Do not add or modify any HTTP response headers on the MCP endpoint** without confirming the effect on Claude Desktop's OAuth popup behavior. The working state is: `401` with no `WWW-Authenticate` header, `oauth_url` in the JSON body. Do not change this.
3. **The `/authorize` redirect to Microsoft must include `GroupMember.Read.All` in the scope.** It is currently on line 1670 of `mcp/src/index.ts`. Do not remove it. Verify it is present after any auth flow changes.
4. **Verify Azure group ID constants before any deploy.** Current confirmed correct values:
   - `GROUP_OWNERS = "cba99ef2-0d00-4753-9f3d-89ded870cba1"` (Alexandria-Owners)
   - `GROUP_ADMINS = "c85b685b-17e4-4902-ac2a-39e27f585f08"` (Alexandria-Admins)
   - `GROUP_USERS  = "6864b47f-e09f-4faf-bde2-738c1ac014c4"` (Alexandria-Users)
5. **Test the OAuth popup manually before declaring anything complete.** Click Connect in Claude Desktop, confirm the Microsoft login page appears, log in, confirm Connected status. Do not rely on server-side tests alone.
6. **Do not touch the OAuth `/authorize` endpoint flow without re-reading the postmortem** at `ref/# Step 5 OAuth Postmortem.md`.

---

## Part 1: Permissions Infrastructure

### The New Auth Model

**Three authentication tiers — Azure AD controls these:**

| Tier | Azure Group | What it gates |
|---|---|---|
| Owner | Alexandria-Owners | Full platform control. Can manage admins. Single seat (Brandon). |
| Admin | Alexandria-Admins | Can manage users and their platform permissions. Portal access. |
| User | Alexandria-Users | Everyone else. What they can do is defined entirely by the permissions matrix, not by Azure. |

Azure AD group membership answers one question only: **are you allowed into the system at
all, and at what administrative level?** Everything after that is the platform's job.

**What this replaces:** The current `admin`, `practice_leader`, `practitioner` three-tier
model is retired as the capability gate. It becomes an artifact of the old system. The new
model separates the concerns cleanly.

---

### The Permissions Matrix

Capabilities are defined by a platform-managed permissions matrix, independent of Azure. An
Admin assigns permissions to users through the portal. Permissions define what a user can
read, write, update, and delete across every content type and tool in Alexandria.

This is not a future-state idea. It ships in Step 5. Every capability currently gated by
hardcoded tier checks gets migrated into the matrix. The matrix starts with the same
functional rules as today — just stored in the database and managed in the portal instead of
hardcoded in middleware.

---

### Database Schema

**Audit step first:** Before building, read the current `users` table schema in Postgres and
the full `requireAuth()` middleware implementation. Understand exactly what fields exist and
where tier checks are performed. Do not proceed until you have a clear picture of the current
state.

**New and modified tables:**

```sql
-- Modified: users table
-- Add practice field if not present. Remove tier as capability source (keep for
-- migration period, but stop overwriting from Azure after cutover).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS practice TEXT,
  ADD COLUMN IF NOT EXISTS portal_access BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mcp_access BOOLEAN NOT NULL DEFAULT TRUE;

-- New: roles table
-- Seeded with initial role set. Admins can create new roles via portal UI.
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,          -- 'practice_leader', 'developer', 'pm', etc.
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,    -- system roles cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- New: permissions table
-- Defines what each role can do. action format: 'content_type:operation'
-- Examples: 'methodology:read', 'brand_package:write', 'capability_record:update',
--           'mcp_tool:alexandria_save_brand_package', 'portal:access'
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,               -- 'resource:operation' format
  scope TEXT DEFAULT 'own_practice',  -- 'own_practice' | 'all' | 'none'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- New: user_roles table
-- A user can have multiple roles. Roles are additive.
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);
```

---

### Initial Seeded Roles

Seed these roles on migration. They represent the functional equivalents of the current
hardcoded tiers, translated into the matrix model. No portal UI is required to create these
— they are seeded via migration script.

**Role: `practice_leader`** (system role)
```
methodology:read              scope: all
methodology:write             scope: own_practice
methodology:update            scope: own_practice
brand_package:read            scope: all
brand_package:write           scope: own_practice
brand_package:update          scope: own_practice
capability_record:read        scope: all
capability_record:write       scope: own_practice
capability_record:update      scope: own_practice
mcp_tool:alexandria_save_brand_package    scope: own_practice
mcp_tool:alexandria_update_capability     scope: own_practice
mcp_tool:alexandria_save_template         scope: own_practice  [when built]
portal:access                 scope: own_practice
portal:dashboard              scope: own_practice
systemInstructions:read       scope: all
visionOfGood:read             scope: all
tips:read                     scope: all
checkPrompt:read              scope: all
```

**Role: `practitioner`** (system role)
```
methodology:read              scope: own_practice
brand_package:read            scope: all
capability_record:read        scope: own_practice
template:read                 scope: own_practice
portal:access                 scope: none
mcp_tool:standard_production  scope: own_practice
```

**Role: `content_admin`** (system role — Brandon's functional role, separate from Owner auth tier)
```
[all resources]:read          scope: all
[all resources]:write         scope: all
[all resources]:update        scope: all
[all resources]:delete        scope: all
portal:access                 scope: all
portal:users                  scope: all
portal:roles                  scope: all
```

**Placeholder roles — create as empty shells, populate after Discovery Intensives:**
```
developer       -- likely: Sanity write tools via MCP, GitHub integration access
project_manager -- likely: Asana scaffolding tools, project template access
account_exec    -- TBD from discovery
```

These empty shells exist in the roles table with no permissions assigned. They are visible
in the portal roles UI but grant nothing until permissions are added. This is intentional —
the role names are placeholders for capabilities that will be defined during practice
Discovery Intensives.

---

### Migration Sequence

**This sequence is non-negotiable. Do not reorder.**

**Step 1: Audit**
Read and document: current `users` table schema, `tierFromGroups()` implementation,
`upsertUser()` implementation, `requireAuth()` implementation, every location in the MCP
server where tier is checked for capability decisions. Create a checklist of every hardcoded
tier check that needs to be migrated.

**Step 2: Run database migrations**
Add `portal_access`, `mcp_access` columns to `users`. Create `roles`, `permissions`,
`user_roles` tables. Do not remove or modify `tier` column yet — it stays as a reference
during transition.

**Step 3: Seed initial roles and permissions**
Run the seed script for the four initial roles. Assign roles to existing users based on
their current `tier` value:
- `admin` tier → `content_admin` role + `portal_access = true`
- `practice_leader` tier → `practice_leader` role + `portal_access = true`
- `practitioner` tier → `practitioner` role + `portal_access = false`

**Step 4: Build the permissions resolver**
Create a `checkPermission(userId, action, scope?)` function that:
1. Fetches the user's assigned roles from `user_roles`
2. Fetches all permissions for those roles from `permissions`
3. Returns true/false for the requested action and scope
4. Caches the result for the duration of the request (not across requests)

**Step 5: Replace hardcoded tier checks with permissions resolver**
Work through the checklist from Step 1. Replace every `if (user.tier === 'practice_leader')`
style check with `checkPermission(userId, 'relevant:action')`. Do them all. Leave none
behind.

**Step 6: Stop overwriting `users.tier` from Azure**
Modify the OAuth login flow. Azure AD groups now determine only:
- Can this user authenticate at all? (must be in Alexandria-Users, Alexandria-Admins, or
  Alexandria-Owners)
- Is this user an Owner or Admin? (used only to gate the portal users/roles management UI)

Remove the `tierFromGroups()` → `upsertUser()` tier overwrite. The `tier` column can remain
in the table for reference but is no longer written to on login and is no longer read by
`requireAuth()`.

**Step 7: Validate end-to-end**
- Confirm a practitioner-tier user cannot access gated MCP fields
- Confirm a practice_leader-role user can call write tools scoped to their practice
- Confirm an admin-tier portal user can manage users and roles
- Confirm an Owner-tier user can manage admins
- Confirm Azure group removal does not grant/revoke capabilities (only blocks login)
- Confirm practice scoping filters MCP responses to own_practice for practitioner role

**Step 8: Add practice scoping to all MCP list/get tools**
With the permissions resolver in place and `users.practice` populated, update all MCP tools
that return lists (`alexandria_list_methodologies`, `alexandria_list_capabilities`,
`alexandria_list_templates`, etc.) to filter by the authenticated user's practice when their
role scope is `own_practice`. Admins and content_admin role see everything.

---

### Pre-Deploy Checklist

Do not merge to `main` or deploy to Railway until every item is checked.

**Auth flow:**
- [ ] `GET /mcp` returns `401` with no `WWW-Authenticate` header and `oauth_url` in JSON body
- [ ] `GET /.well-known/oauth-authorization-server` returns `200` with correct metadata
- [ ] `GET /authorize?...` redirects to Microsoft login with scope including `GroupMember.Read.All`
- [ ] OAuth popup in Claude Desktop opens the Microsoft login page (not blank)
- [ ] Login completes and connector shows Connected

**Permissions:**
- [ ] Practitioner-role user cannot access `systemInstructions`, `visionOfGood`, `tips`, `checkPrompt`
- [ ] Practice-leader-role user can call `alexandria_update_capability` and `alexandria_save_brand_package`
- [ ] Admin-role user sees full methodology content and can access portal
- [ ] Azure group removal blocks login but does not alter capability assignments

**Database:**
- [ ] `roles`, `permissions`, `user_roles` tables exist with seeded data
- [ ] Existing users have been backfilled with correct roles from their current `tier` value
- [ ] `portal_access` is `true` for all admin and practice_leader users

**Portal:**
- [ ] Users page shows role assignment UI
- [ ] Roles page lists all seeded roles with permissions
- [ ] Admin can add/remove permissions from a role
- [ ] System roles cannot be deleted

---

### Portal: User and Role Management UI

The portal already has a Users management page. Extend it and add a Roles page.

**Users page (extend existing):**
- Existing: view all users, change tier, set practice
- Add: assign/remove roles per user (multi-select from available roles)
- Add: toggle `portal_access` explicitly (separate from role assignment)
- Add: practice assignment (if not already present)
- Remove: tier dropdown (replaced by role assignment)

**Roles page (new):**
- List all roles with display name, description, system flag, user count
- View permissions per role (resource + operation + scope)
- Add permission to a role
- Remove permission from a role
- Create new role (display name, description, slug auto-generated)
- Cannot delete system roles
- Cannot edit system role slugs

**Access:** Owner and Admin auth tiers only. Portal Users cannot manage roles.

**Important:** The roles UI does not need to be a sophisticated RBAC builder on day one. A
clean table of roles, a permissions list per role with add/remove capability, and a user
assignment interface is sufficient. The architecture supports complexity later. The UI does
not need to.

---

### What This Does NOT Include (Deferred)

- Developer role capabilities — no Sanity write tools via MCP exist yet. Role shell is
  seeded with no permissions. Populate when the tools ship.
- Project Manager role capabilities — no Asana scaffolding tools exist yet. Same pattern.
- Account Exec role capabilities — requires Discovery Intensive input. Shell seeded.
- Group-based permissions (assigning permissions to a named group of users rather than a
  role) — valid future direction, deferred until individual role management is proven.
- External organization support (different permission sets for NewCo clients) — future state,
  architecture supports it, do not build it now.

---

## Part 2: Content Scoping

Content scoping is the filtering of MCP responses by the authenticated user's practice
assignment. It is not a separate build — it is an output of the permissions migration.

Once `users.practice` is populated and the permissions resolver is in place, every MCP list
and get tool that has `scope: own_practice` in the practitioner role filters its Sanity query
by `practiceArea == $userPractice`.

**Tools that get practice scoping applied:**
- `alexandria_list_methodologies`
- `alexandria_list_capabilities`
- `alexandria_list_templates`
- `alexandria_list_deliverables`

**Tools that do NOT get practice scoping (all users see all):**
- `alexandria_list_brand_packages` — brand packages are client-scoped, not practice-scoped
- `alexandria_help` — returns platform-wide inventory by design
- `alexandria_whoami` — user's own identity data

**Admin and content_admin roles bypass practice scoping entirely** — they see all content
regardless of practice assignment.

---

## Part 3: Workflow Guides — Deferred

The original Step 5 included Workflow Guides as a content type. Discovery has not resolved
the fundamental questions that need to be answered before this can be built:

- What does a workflow guide contain that a methodology doesn't already cover?
- Is this practitioner-facing (Claude walks them through it) or practice leader-facing
  (reference documentation)?
- How different are workflow guides across practices -- one schema or practice-specific
  structures?
- Who authors them and through what interface?
- Does this content belong in Claude Project system prompts rather than MCP lookups?

**These questions cannot be answered without Discovery Intensive input from practice
leaders.** Workflow Guides are deferred to Step 10 (Content Expansion from Discovery).
As each practice completes its Discovery Intensive, workflow guide requirements will surface
organically and can be built against real requirements rather than assumptions.

**Practice Areas as a standalone content type** is also deferred. `practiceArea` as an enum
field on existing records is sufficient for everything the platform needs to do today.
Richer practice area content (description, team structure, standing operating procedures)
may emerge from Discovery Intensives -- if it does, it belongs in Step 10.

---

## Part 4: Updated Step 5 in the Implementation Plan

Replace the current Step 5 entry with the following:

---

### Step 5: Permissions Infrastructure + Content Scoping

**Status:** Discovery complete. Ready to build.

**What this is:** Decoupling auth from capabilities. The current system uses Azure AD group
membership as the source of truth for capability decisions. This step migrates capabilities
to a platform-managed permissions matrix, makes Azure AD auth-only, and adds practice
scoping to all MCP content responses.

**Why this must ship before May 11:** The platform is about to scale from a handful of
builders to 33 practitioners across 9 practices. Hardcoded tier checks coupled to Azure
groups cannot support the functional role differentiation that practice activation will
require. Every new tool and content type added after May 11 will need to be gated against
the permissions matrix anyway -- doing this after launch means a major refactor under load.

**Build:** See `step-5-discovery-and-plan-updates.md` for full spec.

**Summary of changes:**
- New Postgres tables: `roles`, `permissions`, `user_roles`
- Modified: `users` table (add `portal_access`, `mcp_access`, `practice` if missing)
- New: `checkPermission()` resolver replacing all hardcoded tier checks
- Modified: OAuth login flow — Azure groups gate auth only, stop overwriting `users.tier`
- New: practice scoping on all MCP list/get tools
- Modified: Portal Users page — role assignment replaces tier dropdown
- New: Portal Roles page — role and permission management UI
- Seeded: `practice_leader`, `practitioner`, `content_admin` roles with permissions
- Seeded (empty shells): `developer`, `project_manager`, `account_exec` roles

**Workflow Guides:** Deferred to Step 10. Requires Discovery Intensive input.
**Practice Areas as content type:** Deferred to Step 10. Enum field is sufficient for now.

**Depends on:** Steps 1–4 complete. No new content type dependencies.

---

## Part 5: Downstream Notes

**Step 6 (Dashboards):** The permissions matrix means the dashboard needs to respect role-
based access. Practice leaders see their practice slice. Admins see everything. Owner sees
everything plus user management data. Build the dashboard queries against `checkPermission()`
the same way MCP tools do -- do not hardcode tier checks in dashboard API routes.

**Step 7 (Claude Project Architecture):** The practice scoping built in Step 5 directly
informs what belongs in a Claude Project system prompt vs. MCP. A practitioner's practice
assignment is already known to the platform. Claude Projects can be pre-scoped to a practice
context at setup time. This reduces what needs to be in the system prompt.

**Step 8 (LOB Tools):** Every LOB tool capability (RFP scraper access, proposal generator
access) should be gated as a permission in the matrix rather than hardcoded. When a LOB tool
is built, define its permission action (`lob_tool:rfp_scraper`) and assign it to the
appropriate role. This is the pattern -- do not add new hardcoded checks.

**Step 10 (Content Expansion):** Workflow guides and richer practice area content land here
after Discovery Intensives surface real requirements. The permissions matrix is ready for
them -- `workflow_guide:read` and `workflow_guide:write` can be added to roles as soon as
the content type exists.

---

*Discovery session: March 30, 2026. Participants: Brandon Travis.*
*This document supersedes the original Step 5 placeholder in the implementation plan.*
