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
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
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
  const [user] = await db`
    INSERT INTO users (object_id, email, name, last_seen_at)
    VALUES (${objectId}, ${email ?? null}, ${name ?? null}, NOW())
    ON CONFLICT (object_id) DO UPDATE SET
      email        = EXCLUDED.email,
      name         = EXCLUDED.name,
      last_seen_at = NOW()
    RETURNING *
  `;
  return user;
}

export async function getUserByObjectId(objectId: string) {
  const [user] = await db`
    SELECT * FROM users WHERE object_id = ${objectId}
  `;
  return user ?? null;
}
