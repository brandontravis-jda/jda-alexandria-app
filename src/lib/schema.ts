import { db } from "./db";

export type PermissionTier = "practitioner" | "practice_leader" | "admin";

export async function migrate() {
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      object_id     TEXT NOT NULL UNIQUE,
      email         TEXT,
      name          TEXT,
      tier          TEXT NOT NULL DEFAULT 'practitioner',
      practice      TEXT,
      portal_access BOOLEAN NOT NULL DEFAULT FALSE,
      mcp_access    BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Add columns if the table already existed without them
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_access BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS mcp_access BOOLEAN NOT NULL DEFAULT TRUE`;

  await db`
    CREATE TABLE IF NOT EXISTS api_keys (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_hash      TEXT NOT NULL UNIQUE,
      key_prefix    TEXT NOT NULL,
      name          TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at  TIMESTAMPTZ
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS roles (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug         TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      description  TEXT,
      is_system    BOOLEAN NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by   INTEGER REFERENCES users(id)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS permissions (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      action     TEXT NOT NULL,
      scope      TEXT NOT NULL DEFAULT 'own_practice'
                   CHECK (scope IN ('own_practice', 'all', 'none')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(role_id, action)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS user_roles (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      granted_by INTEGER REFERENCES users(id),
      granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, role_id)
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles(user_id)`;
  await db`CREATE INDEX IF NOT EXISTS permissions_role_idx ON permissions(role_id)`;
}

export async function upsertUser({
  objectId,
  email,
  name,
  tier,
}: {
  objectId: string;
  email?: string | null;
  name?: string | null;
  tier?: string | null;
}) {
  // tier is only written on first creation. Subsequent logins do NOT overwrite tier —
  // capabilities are now managed through user_roles, not the tier column.
  const [user] = await db`
    INSERT INTO users (object_id, email, name, tier, last_seen_at)
    VALUES (${objectId}, ${email ?? null}, ${name ?? null}, ${tier ?? "practitioner"}, NOW())
    ON CONFLICT (object_id) DO UPDATE SET
      email        = EXCLUDED.email,
      name         = EXCLUDED.name,
      last_seen_at = NOW()
    RETURNING *
  `;

  // Backfill role assignment for new users.
  // With the new Azure group model, authTier is only "admin" or "practitioner".
  // "admin" → content_admin role; "practitioner" → practitioner role.
  if (tier) {
    const roleSlugMap: Record<string, string> = {
      admin:        "content_admin",
      practitioner: "practitioner",
    };
    const roleSlug = roleSlugMap[tier] ?? "practitioner";
    await db`
      INSERT INTO user_roles (user_id, role_id)
      SELECT ${user.id as number}, r.id FROM roles r WHERE r.slug = ${roleSlug}
      ON CONFLICT (user_id, role_id) DO NOTHING
    `;
    if (tier === "admin" || tier === "practice_leader") {
      await db`UPDATE users SET portal_access = TRUE WHERE id = ${user.id as number} AND portal_access = FALSE`;
    }
  }

  return user;
}

export async function getUserByObjectId(objectId: string) {
  const [user] = await db`
    SELECT * FROM users WHERE object_id = ${objectId}
  `;
  return user ?? null;
}
