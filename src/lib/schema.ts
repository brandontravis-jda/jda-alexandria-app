import { db } from "./db";

export async function migrate() {
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      object_id     TEXT NOT NULL UNIQUE,
      email         TEXT,
      name          TEXT,
      account_type  TEXT NOT NULL DEFAULT 'user'
                      CHECK (account_type IN ('owner', 'admin', 'user')),
      practice      TEXT,
      portal_access BOOLEAN NOT NULL DEFAULT FALSE,
      mcp_access    BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Rename tier → account_type if table already exists with old column
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'user' CHECK (account_type IN ('owner', 'admin', 'user'))`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_access BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS mcp_access BOOLEAN NOT NULL DEFAULT TRUE`;

  // Backfill account_type from legacy tier column if it exists
  await db`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tier') THEN
        UPDATE users SET account_type = CASE
          WHEN tier IN ('admin', 'practice_leader') THEN 'admin'
          ELSE 'user'
        END WHERE account_type = 'user';
      END IF;
    END
    $$
  `;

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

  // Rename permissions → role_permissions if old table exists
  await db`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions')
         AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        ALTER TABLE permissions RENAME TO role_permissions;
      END IF;
    END
    $$
  `;

  await db`
    CREATE TABLE IF NOT EXISTS role_permissions (
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

  // User-level permission overrides (grant / deny)
  await db`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action     TEXT NOT NULL,
      type       TEXT NOT NULL CHECK (type IN ('grant', 'deny')),
      scope      TEXT NOT NULL DEFAULT 'all'
                   CHECK (scope IN ('own_practice', 'all', 'none')),
      granted_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, action)
    )
  `;

  // Org config singleton
  await db`
    CREATE TABLE IF NOT EXISTS org_config (
      id              INTEGER PRIMARY KEY DEFAULT 1,
      default_role_id UUID REFERENCES roles(id),
      CHECK (id = 1)
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles(user_id)`;
  await db`CREATE INDEX IF NOT EXISTS role_permissions_role_idx ON role_permissions(role_id)`;
  await db`CREATE INDEX IF NOT EXISTS user_permissions_user_idx ON user_permissions(user_id)`;

  // Seed system roles (idempotent)
  await db`
    INSERT INTO roles (slug, display_name, description, is_system) VALUES
      ('editor',       'Editor',       'Elevated production access. Write access scoped to own practice.', TRUE),
      ('practitioner', 'Practitioner', 'Standard production access. Platform default for new users.', TRUE)
    ON CONFLICT (slug) DO NOTHING
  `;

  // Seed org_config pointing to practitioner as default role
  await db`
    INSERT INTO org_config (id, default_role_id)
    SELECT 1, r.id FROM roles r WHERE r.slug = 'practitioner'
    ON CONFLICT (id) DO NOTHING
  `;

  // Owners and admins always have portal_access — backfill existing rows
  await db`
    UPDATE users SET portal_access = TRUE
    WHERE account_type IN ('owner', 'admin') AND portal_access = FALSE
  `;
}

export async function upsertUser({
  objectId,
  email,
  name,
}: {
  objectId: string;
  email?: string | null;
  name?: string | null;
}) {
  // Determine if an owner already exists before touching the user record
  const [ownerCheck] = await db`SELECT id FROM users WHERE account_type = 'owner' LIMIT 1`;
  const isFirstUser = !ownerCheck;

  const [user] = await db`
    INSERT INTO users (object_id, email, name, account_type, portal_access, last_seen_at)
    VALUES (
      ${objectId},
      ${email ?? null},
      ${name ?? null},
      ${isFirstUser ? "owner" : "user"},
      ${isFirstUser},
      NOW()
    )
    ON CONFLICT (object_id) DO UPDATE SET
      email        = EXCLUDED.email,
      name         = EXCLUDED.name,
      last_seen_at = NOW(),
      -- Owners and admins always get portal access reinstated on login
      portal_access = CASE
        WHEN users.account_type IN ('owner', 'admin') THEN TRUE
        ELSE users.portal_access
      END
    RETURNING *
  `;

  // Assign default role to brand-new users only (when they were just inserted)
  // We detect a new insert if created_at == last_seen_at (within a second)
  const isNewUser = Math.abs(
    new Date(user.created_at as string).getTime() -
    new Date(user.last_seen_at as string).getTime()
  ) < 2000;

  if (isNewUser) {
    await db`
      INSERT INTO user_roles (user_id, role_id)
      SELECT ${user.id as number}, oc.default_role_id
      FROM org_config oc
      WHERE oc.default_role_id IS NOT NULL
      ON CONFLICT (user_id, role_id) DO NOTHING
    `;
  }

  return user;
}

export async function getUserByObjectId(objectId: string) {
  const [user] = await db`
    SELECT * FROM users WHERE object_id = ${objectId}
  `;
  return user ?? null;
}
