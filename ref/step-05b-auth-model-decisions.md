# Alexandria Auth Model — Finalized Decisions
**Date:** April 1, 2026  
**Status:** Decisions locked. Ready to implement.  
**Supersedes:** `step-05-alexandria-auth-architecture-decisions.md` (structural direction) and `step-5-auth-architecture-review.md` (issue list)

---

## The Model

### Identity Provider (Azure AD)

Single group: **Alexandria-Users**.

If you are in the group, you can authenticate. That is all Azure does. It does not signal account type, role, or any capability. Everything after "you are authenticated" is the app's responsibility.

**Future enhancement:** Email/password signup with local credentials, building an IdP layer similar to WordPress first-run setup or SaaS account creation. At that point, SSO becomes one of several configured authentication methods rather than the only path. This is not in scope now. Document it, do not build it.

---

### Account Types (3, system-defined, not editable)

Account types are the platform's administrative tier. They are not the same as App Roles.

| Account Type | How you get it | What it means |
|---|---|---|
| **Owner** | First login to a fresh system (no Owner exists). After that, transferred by the current Owner only. | Full platform control. One per platform at all times. |
| **Admin** | Assigned by Owner or another Admin via portal. | Can manage users, roles, and permissions. |
| **User** | Default for all new logins. | What they can do is determined entirely by their App Role and any user-level permission overrides. |

**Owner rules:**
- There is exactly one Owner at all times.
- Cannot be assigned via the standard user management UI. Has its own distinct "Transfer Ownership" action, Owner-initiated only, target must be an existing account.
- Cannot be modified, demoted, or deleted through any portal API route. This is enforced at the code level, not the permission level.
- If the Owner account is somehow lost (deleted from DB), recovery requires direct DB access. There is no automatic re-claim mechanism after initial setup. This is intentional — automatic ownership claims after bootstrap are a security surface we don't need.

**First login bootstrap:**
On every login, before creating or updating the user record, the system checks: does an Owner account exist? If not, the authenticating user becomes Owner regardless of who they are. This fires exactly once in the life of a fresh system. After an Owner exists, this check is a no-op.

**Admin assignment:**
Both Owner and Admin can promote a User to Admin. Only Owner can promote an Admin to Owner (via Transfer, not assignment).

---

### App Roles (fully in-app, customizable)

App Roles define what a user can do. They are entirely managed inside Alexandria — create, rename, edit permissions, delete (non-system roles). No Azure group membership signals a role.

**Role identity is always the UUID.** Display name and slug are editable metadata. Renaming a role never breaks permission lookups, user assignments, or capability checks — everything references the UUID.

**Two system defaults (cannot be deleted, can have permissions edited):**
- **Editor** — elevated production access. Equivalent to the current `practice_leader` role.
- **Practitioner** — standard production access. Default for new users.

**Additional roles created as needed:** Developer, Project Manager, Account Executive (currently empty shells — populate when Discovery Intensives surface real requirements).

**New users get:** account_type `User` + the org's configured default role (initially: Practitioner).

---

### Default Role Configuration

The default role assigned to new users is configurable by Owner/Admin in org settings (`Settings → Organization`). Stored as `default_role_id` in an org config table.

**Why this matters:** If JDA later adds interns, contractors, or a new practice with restricted access needs, the admin changes the default role before onboarding that cohort — rather than manually overriding each new user. One setting, one place.

**Future enhancement:** Default role configurable per SSO connection (different IdPs get different defaults). Not in scope now.

---

### Permissions Model

Two layers, always evaluated together.

**Layer 1 — Role permissions:** Every role has a set of permissions (`resource:operation` format, with scope). A user inherits all permissions from all roles assigned to them. Roles are additive — if a user has two roles, they get the union of both permission sets.

**Layer 2 — User-level overrides:** Permissions can be explicitly granted to a specific user, independent of their role. These stack on top of role permissions. User-level grants always win over role grants.

**What user-level overrides can do now:**
- Grant a permission the user's role doesn't have.
- Remove a redundant explicit grant (clean up).

**What user-level overrides cannot do now (future enhancement):**
- Deny a permission that a role grants. Role-granted permissions cannot be taken away at the user level yet. To restrict a user below their role, change their role or create a more restricted role for them.

**Conflict indicator in the UI:**
- If a user has a permission explicitly granted that their role already grants → show as "Redundant — granted by role [Role Name]. You can remove this override without changing access."
- If a user has a permission explicitly granted that their role does not grant → show as "Custom grant — not inherited from any assigned role."
- Deny conflicts (future) will need their own indicator when built.

---

### Permission Lookup

All permission lookups use `app_role_id` (UUID). Never slug, never display name.

Query pattern:
```sql
SELECT p.action, p.scope
FROM user_app_roles ur
JOIN app_role_permissions p ON p.app_role_id = ur.app_role_id
WHERE ur.user_id = $userId

UNION

SELECT up.action, up.scope
FROM user_permissions up
WHERE up.user_id = $userId
```

User-level permissions take precedence where there is overlap.

---

### `alexandria_whoami` Response

Returns all three layers clearly:

```
Account type: Owner
App role: Editor
  Permissions from role:
    methodology:read (scope: all)
    methodology:write (scope: own_practice)
    [...]
User-level overrides:
    mcp_tool:alexandria_save_template (scope: all) — custom grant
```

If no user-level overrides: "No custom permissions — all access from assigned role."

---

### Naming Conventions (to eliminate the `role` collision)

| What | Old name | New name |
|---|---|---|
| Administrative tier | `tier` (column), `"admin"` (value) | `account_type` (column), `"owner"` / `"admin"` / `"user"` |
| App-defined capability groups | `roles` (table), `role` (general) | `app_roles` (table), "App Role" (UI label) |
| User→role assignment | `user_roles` (table) | `user_app_roles` (table) |
| Role permissions | `permissions` (table) | `app_role_permissions` (table) |
| User permission overrides | (didn't exist) | `user_permissions` (table) |
| Org default role | (didn't exist) | `org_config.default_role_id` |

---

### Database Schema Changes

```sql
-- users table: rename tier → account_type, values: 'owner' | 'admin' | 'user'
ALTER TABLE users RENAME COLUMN tier TO account_type;

-- New org_config table (singleton row, id = 1)
CREATE TABLE org_config (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  default_role_id UUID REFERENCES app_roles(id),
  CHECK (id = 1)  -- only one row ever
);

-- Rename roles → app_roles (no structural change)
ALTER TABLE roles RENAME TO app_roles;

-- Rename user_roles → user_app_roles (no structural change)
ALTER TABLE user_roles RENAME TO user_app_roles;

-- Rename permissions → app_role_permissions (no structural change)
ALTER TABLE permissions RENAME TO app_role_permissions;

-- New user_permissions table (user-level overrides)
CREATE TABLE user_permissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,
  scope      TEXT NOT NULL DEFAULT 'all'
               CHECK (scope IN ('own_practice', 'all', 'none')),
  granted_by INTEGER REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, action)
);
```

---

### What Changes in the Code

**MCP `authTierFromGroups`:** Collapses to: in group → authenticated, not in group → rejected. No tier mapping from Azure.

**`upsertUser`:** On first login ever (no Owner exists) → set `account_type = 'owner'`. On all subsequent first-time logins → set `account_type = 'user'`, assign `default_role_id` from `org_config`. On returning logins → update email, name, last_seen_at only. Account type and role never overwritten by login.

**`checkPermission`:** Queries `user_app_roles → app_role_permissions` UNION `user_permissions`. User-level wins on conflict.

**`requireAdmin`:** Checks `account_type IN ('owner', 'admin')`. Not a permission check — account type is the correct gate for platform administration. Permission checks are for capability decisions.

**Owner guard:** Any API route that modifies a user checks: is the target user `account_type = 'owner'`? If yes, reject with 403. Only the Transfer Ownership route is exempt from this guard.

**Portal `auth.ts`:** No tier mapping from Azure groups. `authTierFromGroups` removed. On login: verify user is in Alexandria-Users group. If not, reject. If yes, proceed to `upsertUser`.

---

### What Does NOT Change

- The `checkPermission()` resolver pattern — same logic, new table names.
- The permissions matrix content — same actions, same scopes, just in renamed tables.
- The MCP OAuth flow — no changes to `/authorize`, `/token`, `/callback`. The only change is what happens after a successful Azure auth.
- Existing seeded permissions — migrate to new table names, data intact.

---

### Future Enhancements (document, do not build)

1. **User-level permission denials** — explicitly deny a permission a role grants. Requires conflict UI design and precedence rules for "role updated to grant more."
2. **Per-SSO-connection default role** — different IdPs get different default roles at onboarding.
3. **Email/password authentication** — local credentials as an alternative to SSO. Builds an IdP layer. Standard SaaS first-run setup (like WordPress). SSO becomes one configured auth method, not the only path.
4. **Configurable Owner recovery flow** — a designated recovery admin who can reclaim Owner via a time-limited token without DB access. Useful if/when Alexandria becomes a product used by others.

---

*Decisions finalized April 1, 2026. Implementation spec for Cursor — build against this document.*
