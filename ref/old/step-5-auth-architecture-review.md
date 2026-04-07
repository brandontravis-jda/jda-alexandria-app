# Step 5 Auth Architecture Review
**Date:** April 1, 2026  
**Status:** Issues identified. Fixes recommended before team rollout.

---

## What Was Built in Step 5

Step 5 decoupled auth (Azure AD) from capabilities (Alexandria permissions matrix). The intent was correct:

- Azure AD answers: can you get in, and at what administrative level?
- The permissions matrix answers: what can you do once you're in?

**Shipped:**
- `roles`, `permissions`, `user_roles` tables in Postgres
- `checkPermission()` resolver — queries `user_roles → permissions` at request time
- All MCP capability gates migrated from hardcoded tier checks to `checkPermission()`
- Portal `/roles` and `/users` pages for managing the matrix
- 6 system roles seeded, 49 permissions across 3 active roles
- 2 users connected and authenticated (Brandon, Joe Parker)

---

## Current Auth Flow (as built)

### MCP OAuth login
1. User authenticates via Microsoft → MCP gets Azure group memberships
2. `authTierFromGroups()` maps groups → `"admin"` or `"practitioner"`
3. `upsertUser()` inserts user on first login; on subsequent logins **only updates `email`, `name`, `last_seen_at`** — `tier` is NOT updated
4. `upsertUser()` also inserts a `user_roles` row mapping auth tier → system role (`admin` → `content_admin`, `practitioner` → `practitioner`) — idempotent, never overwrites
5. Session token created, stored in `oauth_sessions`

### Per tool call
1. Session token resolved → `user_id` retrieved from `oauth_sessions`
2. `auth.tier` set from `users.tier` in DB (not re-derived from Azure)
3. `checkPermission("action")` queries `user_roles JOIN permissions WHERE user_id = $userId`
4. All capability gates use `checkPermission()` — correct

### Portal login (separate flow)
1. Auth.js v5 + Microsoft Entra ID
2. Group membership fetched → `authTierFromGroups()` → tier stored in JWT
3. `requireAdmin()` in API routes reads `users.tier` from DB

---

## Issues

### Issue 1: `users.tier` is frozen after first insert

**What happens:** After the first login, `users.tier` in Postgres is never updated. If you change Azure group membership — add or remove someone from Alexandria-Owners, Admins, or Users — their DB tier stays at whatever it was when they first authenticated.

**Impact:**
- `alexandria_whoami` reads `users.tier` from the DB → shows stale/wrong tier
- `requireAdmin()` in portal API routes reads `users.tier` → portal admin gating can be wrong
- Debugging is confusing: Azure says one thing, DB says another, behavior is unpredictable
- Brandon's concern: changing Azure group membership doesn't reliably change what a user can do in the system

**Root cause:** Step 5 intentionally stopped overwriting `tier` on login to prevent Azure from being a capability source. This was correct reasoning but the wrong implementation — it should have stopped using `tier` for capabilities, not stopped updating it.

---

### Issue 2: `users.tier` is used for portal admin gating

**What happens:** `requireAdmin()` in every portal API route checks `user.tier === "admin"`. This is the DB value (see Issue 1 — it can be stale).

**Impact:** If you add someone to Alexandria-Admins in Azure, they can log into the portal (JWT reflects current group membership) but their `users.tier` in the DB is still `"practitioner"` until it gets updated. Their API calls to `/api/users`, `/api/roles`, etc. return 401 even though they should have admin access.

**What it should check instead:** Whether the user has the `portal:users` or `portal:roles` permission in the matrix — not a raw tier string.

---

### Issue 3: Owner and Admin are the same tier

**What happens:** Both `Alexandria-Owners` (`cba99ef2`) and `Alexandria-Admins` (`c85b685b`) map to `"admin"`. Brandon's session is indistinguishable from any other admin's session.

**Impact:**
- `alexandria_whoami` returns `Tier: Admin` for Brandon — no way to confirm you're hitting the Owner code path vs. a regular admin
- Request logs show `permission_tier = admin` for both Brandon and Joe Parker — can't distinguish
- No mechanism to gate Owner-only actions (e.g. managing admins, future audit tools) without adding a separate check
- Actively makes debugging harder: when something behaves unexpectedly, you can't confirm from logs or `whoami` which tier fired

---

### Issue 4: No separation between "portal login" and "can manage users"

**What happens:** The `content_admin` role bundles everything — `portal:access`, `portal:users`, `portal:roles`, full read/write on all content. It's all or nothing.

**Impact:** You cannot grant someone portal access (to view dashboards, see capabilities) without also giving them full user and role management power. When practice leaders get portal access, they'll need a scoped role that doesn't include `portal:users` and `portal:roles`.

This isn't a crisis today (only 2 users), but it needs to be resolved before practice leaders get portal access.

---

### Issue 5: `isPrivileged` is dead code

A `const isPrivileged = auth.tier === "practice_leader" || auth.tier === "admin"` is defined at line 545 of `mcp/src/index.ts` and referenced nowhere. Harmless but adds noise when debugging.

---

## Brandon's Concerns (from conversation)

1. **Account protection:** Need to ensure no one inside Alexandria can revoke Brandon's access or demote his permissions. Current build doesn't protect this — a portal admin with DB access could change `users.tier` and `user_roles` for any user including Brandon.

2. **Inconsistent behavior when changing Azure groups:** Changing Azure group membership doesn't reliably update what the user can do. The system has too many places where tier/permissions are read from, and they don't stay in sync.

3. **Debugging opacity:** When something doesn't work (e.g. admin callout not showing in `alexandria_help`), there's no reliable way to see which code path fired — because tier comes from three different sources (Azure JWT, `users.tier` DB column, `user_roles` table) and they can all disagree.

---

## Recommended Fixes

### Fix 1: Always update `users.tier` from Azure on every login

`upsertUser()` should restore the `tier = EXCLUDED.tier` update on conflict. `tier` in the DB should always reflect the current Azure group state.

**Rule going forward:** `users.tier` is a display label and logging field. It is never used for capability decisions. Capability decisions always go through `checkPermission()`.

```sql
-- upsertUser ON CONFLICT should be:
DO UPDATE SET
  email        = EXCLUDED.email,
  name         = EXCLUDED.name,
  tier         = EXCLUDED.tier,   -- ← restore this
  last_seen_at = NOW()
```

---

### Fix 2: Add `"owner"` as a distinct auth tier

`authTierFromGroups()` in both MCP and portal auth should return `"owner"` for `GROUP_OWNERS`, not `"admin"`.

```typescript
function authTierFromGroups(groups: string[]): "owner" | "admin" | "practitioner" | null {
  if (groups.includes(GROUP_OWNERS)) return "owner";   // ← was "admin"
  if (groups.includes(GROUP_ADMINS)) return "admin";
  if (groups.includes(GROUP_USERS))  return "practitioner";
  return null;
}
```

**What this enables:**
- `alexandria_whoami` returns `Tier: Owner` for Brandon — unambiguous
- Request logs distinguish Owner calls from Admin calls
- Future Owner-only gates (`portal:manage_admins`) can check `auth.tier === "owner"` cleanly
- Brandon's account protection: code can explicitly reject attempts by non-owners to modify owner accounts

---

### Fix 3: `requireAdmin()` checks permissions, not `users.tier`

Portal API routes should check whether the user has the relevant permission in the matrix, not a tier string in the DB.

```typescript
// Instead of:
if (!user || user.tier !== "admin") return null;

// Should be:
const hasPortalUsers = await userHasPermission(user.id, "portal:users");
if (!hasPortalUsers) return null;
```

This means portal admin gating is driven by the same matrix as everything else. Granting someone portal user management means assigning them a role with `portal:users` — not changing their Azure group.

---

### Fix 4: Split `content_admin` into scoped roles

Create a `portal_viewer` role with only `portal:access` and `portal:dashboard`. Practice leaders get this role. The `content_admin` role retains `portal:users` and `portal:roles`.

| Role | `portal:access` | `portal:users` | `portal:roles` | Content write |
|---|---|---|---|---|
| `content_admin` | ✅ | ✅ | ✅ | ✅ all |
| `practice_leader` | ✅ | ❌ | ❌ | ✅ own practice |
| `portal_viewer` | ✅ | ❌ | ❌ | ❌ |
| `practitioner` | ❌ | ❌ | ❌ | ❌ |

---

### Fix 5: Remove `isPrivileged` dead code

Delete line 545 of `mcp/src/index.ts`. It's never used and adds confusion.

---

## Account Protection Architecture (Brandon's requirement)

The correct model for ensuring Brandon's access cannot be revoked by anyone inside Alexandria:

**Layer 1 (Azure — immutable from inside Alexandria):**
Brandon is in `Alexandria-Owners`. The only way to remove him is via Azure AD Global Admin access. No portal user, no database change, no code change inside Alexandria can affect this. This is the correct root of trust.

**Layer 2 (Code — enforce in `upsertUser` and `requireAdmin`):**
Add an explicit guard: if `auth.tier === "owner"`, never allow `user_roles` or `portal_access` to be modified for that user via any API route. Owner accounts are read-only from the portal's perspective.

```typescript
// In PATCH /api/users/[id]:
if (targetUser.tier === "owner") {
  return NextResponse.json({ error: "Owner accounts cannot be modified via the portal" }, { status: 403 });
}
```

**Layer 3 (Role assignment — Owner auto-gets `content_admin`):**
On every login, if `auth.tier === "owner"`, ensure `content_admin` role is assigned regardless of what's in `user_roles`. This prevents a scenario where someone manually deletes Brandon's role assignment from the DB.

---

## Recommended Build Order

1. **Fix 1 + 2 + 5** — one PR, ~20 lines across two files. No DB migration. Fixes the immediate debugging confusion and account protection gap. Deploy and validate with `whoami` before anything else.

2. **Fix 3** — portal `requireAdmin()` switches to permission-based check. Requires the `checkPermission` equivalent in the portal's DB layer (currently only in MCP). Small lift.

3. **Fix 4** — `portal_viewer` role. Add via migration seed. Assign to practice leaders when they get portal access.

---

*Written April 1, 2026. Reflects codebase state at commit `18ebe28`.*
