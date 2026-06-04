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
      mcp_access    BOOLEAN NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Rename tier → account_type if table already exists with old column
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'user' CHECK (account_type IN ('owner', 'admin', 'user'))`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_access BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS mcp_access BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`ALTER TABLE users ALTER COLUMN last_seen_at DROP NOT NULL`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_mcp_seen_at TIMESTAMPTZ`;

  // portal_tier — single hierarchical tier replacing portal_access boolean + portal:* RBAC
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_tier TEXT NOT NULL DEFAULT 'none' CHECK (portal_tier IN ('none','viewer','editor','leadership','admin'))`;
  // One-time migration: backfill portal_tier from legacy fields
  await db`
    UPDATE users SET portal_tier = 'admin'
    WHERE account_type IN ('owner', 'admin') AND portal_tier = 'none'
  `;
  await db`
    UPDATE users SET portal_tier = 'viewer'
    WHERE portal_access = TRUE AND account_type = 'user' AND portal_tier = 'none'
  `;

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

  await db`ALTER TABLE org_config ADD COLUMN IF NOT EXISTS last_ad_sync TIMESTAMPTZ`;

  // Audit log — records admin actions for traceability
  await db`
    CREATE TABLE IF NOT EXISTS audit_log (
      id         SERIAL PRIMARY KEY,
      actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action     TEXT NOT NULL,
      target_type TEXT,
      target_id  TEXT,
      details    JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log(actor_id)`;

  // Practices — managed lookup table replacing the freetext users.practice column
  await db`
    CREATE TABLE IF NOT EXISTS practices (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL UNIQUE,
      slug        TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Many-to-many: a user can belong to multiple practices
  await db`
    CREATE TABLE IF NOT EXISTS user_practices (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      practice_id INTEGER NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, practice_id)
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS user_practices_user_idx ON user_practices(user_id)`;
  await db`CREATE INDEX IF NOT EXISTS user_practices_practice_idx ON user_practices(practice_id)`;

  // Migrate freetext users.practice values into the practices + user_practices tables
  await db`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'practice') THEN
        -- Create practice records for each distinct non-null value
        INSERT INTO practices (name, slug)
          SELECT DISTINCT practice,
                 LOWER(REGEXP_REPLACE(REGEXP_REPLACE(practice, '[^a-zA-Z0-9\\s-]', '', 'g'), '\\s+', '-', 'g'))
          FROM users
          WHERE practice IS NOT NULL AND practice <> ''
        ON CONFLICT (name) DO NOTHING;

        -- Link users to their practice
        INSERT INTO user_practices (user_id, practice_id)
          SELECT u.id, p.id
          FROM users u
          JOIN practices p ON p.name = u.practice
          WHERE u.practice IS NOT NULL AND u.practice <> ''
        ON CONFLICT (user_id, practice_id) DO NOTHING;
      END IF;
    END
    $$
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

  // Clean up legacy portal:* permission data — portal access is now driven by portal_tier
  await db`DELETE FROM role_permissions WHERE action LIKE 'portal:%'`;
  await db`DELETE FROM user_permissions WHERE action LIKE 'portal:%'`;

  // ============================================================
  // Content tables (migrated from Sanity)
  // ============================================================

  // Unify Sanity practiceArea content taxonomy with existing `practices` table
  await db`ALTER TABLE practices ADD COLUMN IF NOT EXISTS sanity_id TEXT`;
  await db`ALTER TABLE practices ADD COLUMN IF NOT EXISTS activation_status TEXT NOT NULL DEFAULT 'not_started' CHECK (activation_status IN ('not_started','in_discovery','activating','active'))`;

  await db`
    CREATE TABLE IF NOT EXISTS methodologies (
      id                      SERIAL PRIMARY KEY,
      sanity_id               TEXT,
      name                    TEXT NOT NULL,
      slug                    TEXT NOT NULL UNIQUE,
      description             TEXT NOT NULL DEFAULT '',
      practice_id             INTEGER REFERENCES practices(id) ON DELETE SET NULL,
      ai_classification       TEXT CHECK (ai_classification IN ('ai_led','ai_assisted','human_led')),
      tools_involved          TEXT[] DEFAULT '{}',
      required_inputs         JSONB DEFAULT '[]',
      system_instructions     TEXT DEFAULT '',
      steps                   JSONB DEFAULT '[]',
      output_format           TEXT DEFAULT '',
      quality_checks          JSONB DEFAULT '[]',
      failure_modes           JSONB DEFAULT '[]',
      vision_of_good          TEXT DEFAULT '',
      tips                    TEXT DEFAULT '',
      client_refinements      JSONB DEFAULT '[]',
      quality_checklist       JSONB DEFAULT '[]',
      baseline_production_time TEXT,
      ai_native_production_time TEXT,
      proven_status           BOOLEAN NOT NULL DEFAULT FALSE,
      proven_date             DATE,
      version                 INTEGER NOT NULL DEFAULT 1,
      author                  TEXT,
      validated_by            TEXT,
      include_feedback_prompt BOOLEAN NOT NULL DEFAULT FALSE,
      status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','archived')),
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS templates (
      id                      SERIAL PRIMARY KEY,
      sanity_id               TEXT,
      title                   TEXT NOT NULL,
      slug                    TEXT NOT NULL UNIQUE,
      format_type             TEXT CHECK (format_type IN ('html-deliverable','word-document','html-email')),
      preview_url             TEXT,
      github_raw_url          TEXT,
      dropbox_link            TEXT,
      use_cases               TEXT DEFAULT '',
      feature_list            TEXT DEFAULT '',
      fixed_elements          TEXT DEFAULT '',
      variable_elements       TEXT DEFAULT '',
      brand_injection_rules   TEXT DEFAULT '',
      client_adaptation_notes TEXT DEFAULT '',
      output_spec             TEXT DEFAULT '',
      quality_checks          TEXT DEFAULT '',
      include_feedback_prompt BOOLEAN NOT NULL DEFAULT FALSE,
      status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','deprecated')),
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS template_practices (
      template_id  INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      practice_id  INTEGER NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
      PRIMARY KEY (template_id, practice_id)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS template_methodologies (
      template_id     INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      methodology_id  INTEGER NOT NULL REFERENCES methodologies(id) ON DELETE CASCADE,
      PRIMARY KEY (template_id, methodology_id)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS brand_packages (
      id                  SERIAL PRIMARY KEY,
      sanity_id           TEXT,
      client_name         TEXT NOT NULL,
      slug                TEXT NOT NULL UNIQUE,
      abbreviations       TEXT,
      logos               JSONB DEFAULT '[]',
      logo_usage_rules    TEXT DEFAULT '',
      extracted_date      DATE,
      source_document     TEXT,
      extracted_by        TEXT,
      gaps                TEXT DEFAULT '',
      raw_markdown        TEXT NOT NULL DEFAULT '',
      identity            JSONB DEFAULT '{}',
      color_palette       JSONB DEFAULT '[]',
      color_usage_rules   TEXT DEFAULT '',
      typography          JSONB DEFAULT '{}',
      web_fonts           JSONB DEFAULT '[]',
      template_overrides  TEXT DEFAULT '',
      voice_and_tone      JSONB DEFAULT '{}',
      brand_architecture  JSONB DEFAULT '{}',
      visual_direction    JSONB DEFAULT '{}',
      key_messaging       JSONB DEFAULT '{}',
      status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','archived')),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS deliverable_classifications (
      id                SERIAL PRIMARY KEY,
      sanity_id         TEXT,
      name              TEXT NOT NULL,
      slug              TEXT NOT NULL UNIQUE,
      practice_id       INTEGER REFERENCES practices(id) ON DELETE SET NULL,
      ai_classification TEXT CHECK (ai_classification IN ('ai_led','ai_assisted','human_led')),
      description       TEXT DEFAULT '',
      status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','archived')),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS capability_records (
      id                       SERIAL PRIMARY KEY,
      sanity_id                TEXT,
      deliverable_name         TEXT NOT NULL,
      slug                     TEXT NOT NULL UNIQUE,
      practice_id              INTEGER REFERENCES practices(id) ON DELETE SET NULL,
      status                   TEXT NOT NULL DEFAULT 'not_evaluated' CHECK (status IN ('not_evaluated','classified','methodology_built','proven_status')),
      ai_classification        TEXT CHECK (ai_classification IN ('ai_led','ai_assisted','human_led')),
      linked_methodology_id    INTEGER REFERENCES methodologies(id) ON DELETE SET NULL,
      current_ai_ceiling       TEXT DEFAULT '',
      ai_support_role          TEXT DEFAULT '',
      recommended_tool_stack   TEXT[] DEFAULT '{}',
      ceiling_last_reviewed    TIMESTAMPTZ,
      live_search_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
      baseline_production_time TEXT,
      ai_native_production_time TEXT,
      proven_status_achieved_at TIMESTAMPTZ,
      source                   TEXT,
      notes                    TEXT DEFAULT '',
      created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS platform_guide (
      id                      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      platform_intro          TEXT NOT NULL DEFAULT '',
      canonical_entry_prompts JSONB DEFAULT '[]',
      feedback_prompt         TEXT DEFAULT '',
      example_prompts         JSONB DEFAULT '[]',
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS methodologies_practice_idx ON methodologies(practice_id)`;
  await db`CREATE INDEX IF NOT EXISTS methodologies_status_idx ON methodologies(status)`;
  await db`CREATE INDEX IF NOT EXISTS capability_records_practice_idx ON capability_records(practice_id)`;
  await db`CREATE INDEX IF NOT EXISTS capability_records_status_idx ON capability_records(status)`;
  await db`CREATE INDEX IF NOT EXISTS brand_packages_slug_idx ON brand_packages(slug)`;
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
    INSERT INTO users (object_id, email, name, account_type, portal_access, portal_tier, last_seen_at)
    VALUES (
      ${objectId},
      ${email ?? null},
      ${name ?? null},
      ${isFirstUser ? "owner" : "user"},
      ${isFirstUser},
      ${isFirstUser ? "admin" : "none"},
      NOW()
    )
    ON CONFLICT (object_id) DO UPDATE SET
      email        = EXCLUDED.email,
      name         = EXCLUDED.name,
      last_seen_at = NOW()
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

export async function getUserPractices(userId: number) {
  return db`
    SELECT p.id, p.name, p.slug
    FROM user_practices up
    JOIN practices p ON p.id = up.practice_id
    WHERE up.user_id = ${userId}
    ORDER BY p.name
  `;
}

export async function getAllPractices() {
  return db`SELECT id, name, slug, description, created_at FROM practices ORDER BY name`;
}

export async function getLastAdSync(): Promise<string | null> {
  const [row] = await db`SELECT last_ad_sync FROM org_config WHERE id = 1`;
  return (row?.last_ad_sync as string) ?? null;
}

export const TIER_LEVEL: Record<string, number> = {
  none: 0,
  viewer: 1,
  editor: 2,
  leadership: 3,
  admin: 4,
};

/**
 * Write an entry to the audit log.
 * Fire-and-forget — failures are logged but don't block the caller.
 */
export async function writeAuditLog(entry: {
  actorId: number | null;
  action: string;
  targetType?: string;
  targetId?: string | number;
  details?: Record<string, unknown>;
}) {
  try {
    await db`
      INSERT INTO audit_log (actor_id, action, target_type, target_id, details)
      VALUES (
        ${entry.actorId},
        ${entry.action},
        ${entry.targetType ?? null},
        ${entry.targetId != null ? String(entry.targetId) : null},
        ${entry.details ? JSON.stringify(entry.details) : null}
      )
    `;
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
