# Alexandria Auth Model — Finalized Decisions
**Date:** April 1, 2026  
**Status:** Decisions locked. Ready to implement.  
**Supersedes:** `step-05-alexandria-auth-architecture-decisions.md` and `step-5-auth-architecture-review.md`

---

## What We Are Building Now

### 1. Identity Provider (Azure AD)

Single group: **Alexandria-Users**.

If you are in the group, you can authenticate. That is all Azure does. No tier, no role, no capability is derived from Azure group membership. Everything after "you are authenticated" is the app's responsibility.

The existing three-group model (Owners, Admins, Users) collapses to one. The Owners and Admins groups can be retired in Azure or left in place — they will not be read by the application.

---

### 2. Account Types

Three fixed types. Not editable. Not the same as Roles.

| Account Type | Value | How you get it |
|---|---|---|
| Owner | `owner` | First login to a fresh system (no Owner exists). After that, transferred by current Owner only. |
| Admin | `admin` | Assigned by Owner or Admin via portal. |
| User | `user` | Default for all new logins. |

**Owner rules — non-negotiable:**
- Exactly one Owner at all times.
- Cannot be assigned via standard user management UI. Has its own "Transfer Ownership" action — Owner-initiated, target must be an existing account.
- Code-level guard in every API route that modifies users: if target user `account_type = 'owner'`, reject with 403. Only the Transfer Ownership route is exempt.
- If Owner account is lost (deleted from DB): recovery requires direct DB access. No automatic re-claim. This is intentional.

**First-login bootstrap:**
On every login, before creating or updating the user record: does an Owner exist? If not, the authenticating user becomes Owner. This fires exactly once in the life of a fresh system. After an Owner exists, this check is a no-op on every subsequent login.

**Admin assignment:**
Owner or Admin can promote a User to Admin. Only Owner can initiate a Transfer of ownership.

**`requireAdmin()` gate:**
Checks `account_type IN ('owner', 'admin')`. This is an account type check, not a permission check. Account type gates platform administration. The permissions matrix gates capabilities.

---

### 3. Roles

Fully managed inside the app. Create, rename, edit permissions, delete (non-system roles). No Azure group membership signals a role.

**Role identity is always the UUID.** Display name and slug are editable metadata. Renaming a role never breaks permission lookups, user assignments, or capability checks — everything references the UUID.

**Two system roles (cannot be deleted, permissions are editable):**
- **Editor** — elevated production access. Equivalent to current `practice_leader` role.
- **Practitioner** — standard production access. Platform default for new users.

**New users get:** `account_type = 'user'` + the org's configured default role (initially: Practitioner).

---

### 4. Configurable Default Role

Stored in `org_config.default_role_id`. Editable by Owner or Admin in portal Settings → Organization.

When a new user authenticates for the first time, they receive the role pointed to by `default_role_id`. If that setting is changed, it only affects future new users — existing assignments are not touched.

---

### 5. Permissions Model

Two layers. Always evaluated together. User-level always wins.

**Layer 1 — Role permissions:** A user inherits all permissions from all roles assigned to them. Multiple roles are additive — the user gets the union of all role permission sets.

**Layer 2 — User-level overrides:** Permissions explicitly set on a specific user, independent of their role. Two types:
- **Grant** — adds a permission the user's role(s) don't grant.
- **Deny** — removes a permission the user's role(s) do grant.

User-level always wins over role-level in both directions. Grant beats role absence. Deny beats role grant.

**Effective permission resolution:**
```
effective = (union of all role permissions) + user grants - user denials
```

---

### 6. Permissions UI

**View mode — three distinct sections on the user record:**

- **Role Permissions** — permissions this user has because of their assigned role(s). Each permission shows which role grants it. Read-only. To change, edit the role or change the user's role assignment.
- **Granted Permissions** — user-level additions. Permissions this user has that their role(s) don't grant. Shows who granted it and when.
- **Denied Permissions** — permissions explicitly blocked for this user. Shows which role would have granted it if the denial weren't in place.

**Edit mode — unified permission list with inline toggle:**
All known permissions shown in one list. Each row has a three-state toggle:
- **Grant** — explicitly grant this permission to the user (regardless of role)
- **Deny** — explicitly deny this permission for this user (regardless of role)
- **Inherit** — no user-level override; user gets whatever their role(s) grant

**Status indicators on each row:**
- Role grants it + Inherit → active via role (normal state)
- Role grants it + Grant → "Redundant — already granted by [Role Name]"
- Role grants it + Deny → "Denied — overrides [Role Name]" (shown with warning color)
- Role doesn't grant it + Grant → "Custom grant — not from any assigned role"
- Role doesn't grant it + Deny → "Denial has no effect — role doesn't grant this"
- Role doesn't grant it + Inherit → not granted (normal state)

---

### 7. `roles` Table and Naming

No `app_` prefix. Clean names.

| Concept | Table / Column |
|---|---|
| Administrative tier | `users.account_type` (values: `owner`, `admin`, `user`) |
| Capability groups | `roles` table |
| User → role assignment | `user_roles` table |
| Role → permission | `role_permissions` table |
| User-level overrides | `user_permissions` table |
| Org default role | `org_config.default_role_id` |

---

### 8. Database Schema

```sql
-- Rename tier → account_type on users table
ALTER TABLE users RENAME COLUMN tier TO account_type;

-- Update account_type values: 'admin' stays 'admin', add 'owner', 'user' replaces 'practitioner'
-- (data migration: existing 'practitioner' → 'user', existing 'admin' → 'admin')

-- Rename roles → no change (already correct name)
-- Rename user_roles → no change (already correct name)  
-- Rename permissions → role_permissions
ALTER TABLE permissions RENAME TO role_permissions;

-- Org config singleton (one row, id always = 1)
CREATE TABLE org_config (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  default_role_id UUID REFERENCES roles(id),
  CHECK (id = 1)
);
INSERT INTO org_config (default_role_id)
  SELECT id FROM roles WHERE slug = 'practitioner';

-- User-level permission overrides
CREATE TABLE user_permissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('grant', 'deny')),
  scope      TEXT NOT NULL DEFAULT 'all'
               CHECK (scope IN ('own_practice', 'all', 'none')),
  granted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, action)  -- one override per user per action
);

CREATE INDEX user_permissions_user_idx ON user_permissions(user_id);
```

---

### 9. Permission Resolver (`checkPermission`)

```sql
-- Step 1: get role-based permissions for user
SELECT rp.action, rp.scope, 'role' AS source
FROM user_roles ur
JOIN role_permissions rp ON rp.role_id = ur.role_id
WHERE ur.user_id = $userId

-- Step 2: get user-level overrides
SELECT action, scope, type
FROM user_permissions
WHERE user_id = $userId
```

Resolution logic:
1. Build map of all role-granted permissions
2. Apply user-level denials (remove from map)
3. Apply user-level grants (add to map)
4. Result is effective permission set

---

### 10. Code Changes

**`mcp/src/index.ts`:**
- `authTierFromGroups` → simplified: in group = authenticated, not in group = rejected. Returns `null` | `"authenticated"`. No tier derived from Azure.
- `upsertUser`: on first-login-ever (no Owner in DB) → set `account_type = 'owner'`. On new user → set `account_type = 'user'`, assign `org_config.default_role_id`. On returning user → update email, name, last_seen_at only. Never overwrite `account_type` or roles.
- `checkPermission`: updated to query `user_roles → role_permissions` UNION `user_permissions`, apply deny/grant logic.
- `isPrivileged`: remove (dead code).
- `alexandria_whoami`: returns account_type, role(s) with permissions, user-level grants, user-level denials.

**`src/lib/auth.ts`:**
- Remove group-to-tier mapping. Verify user is in Alexandria-Users group. If yes, call `upsertUser`. If no, reject.
- `authTierFromGroups` removed.

**Portal API routes:**
- `requireAdmin()`: checks `account_type IN ('owner', 'admin')`.
- All user-modifying routes: add Owner guard — if target `account_type = 'owner'`, return 403 (except Transfer Ownership route).
- `/api/users/[id]` PATCH: handle `user_permissions` add/remove alongside existing role assignment.
- New route: `POST /api/users/[id]/transfer-ownership` — Owner only, swaps `account_type` between two users atomically.

**Portal UI:**
- `/users` page: add permissions view/edit UI with three-section view mode and toggle edit mode.
- `/settings` page (new): org config — default role selector.
- `/users/[id]` or modal: Transfer Ownership action (Owner-only, shown only to Owner).

---

## What Is Deferred

### IdP group → role mapping table
A future `idp_group_role_mappings` table maps an external IdP group ID to a role UUID. When a user authenticates and is in a mapped group, they get that role automatically instead of the default. Needed when you have multiple Azure groups with different meanings, or a second IdP. For now: everyone gets the default role, admins assign roles manually.

### Email/password authentication
Local credentials as an alternative to SSO. Full IdP layer — like WordPress first-run or SaaS account creation. SSO becomes one of several configured auth methods. Not in scope until Alexandria is used by external organizations.

### Configurable Owner recovery
A time-limited recovery token so a designated person can reclaim Owner without DB access. For now: Owner lost = DB access required.

---

*Decisions finalized April 1, 2026. Build against this document.*
