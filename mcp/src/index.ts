import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createClient } from "@sanity/client";
import { createHash, randomBytes } from "crypto";
import { createServer, IncomingMessage, ServerResponse } from "http";
import postgres from "postgres";
import { z } from "zod";

// ── Environment validation ────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID;
if (!SANITY_PROJECT_ID) throw new Error("SANITY_PROJECT_ID is not set");

const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
if (!AZURE_CLIENT_ID) throw new Error("AZURE_CLIENT_ID is not set");

const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
if (!AZURE_CLIENT_SECRET) throw new Error("AZURE_CLIENT_SECRET is not set");

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
if (!AZURE_TENANT_ID) throw new Error("AZURE_TENANT_ID is not set");

const MCP_BASE_URL = process.env.MCP_BASE_URL ?? "https://mcp-production-3192.up.railway.app";

// ── Azure AD security groups ──────────────────────────────────────────────────
// Alexandria-Users is the single authentication gate.
// Everything after "authenticated" is managed inside the app (account_type, roles, permissions).
const GROUP_USERS = "6864b47f-e09f-4faf-bde2-738c1ac014c4"; // Alexandria-Users

function isInAlexandriaUsers(groups: string[]): boolean {
  return groups.includes(GROUP_USERS);
}

const SANITY_DATASET = process.env.SANITY_DATASET ?? "production";
const SANITY_API_VERSION = process.env.SANITY_API_VERSION ?? "2024-01-01";
const SANITY_API_TOKEN = process.env.SANITY_API_TOKEN;

// ── DB ────────────────────────────────────────────────────────────────────────

const isLocal = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");
const sql = postgres(DATABASE_URL, { ssl: isLocal ? false : "require" });

// ── Migrations ────────────────────────────────────────────────────────────────

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS oauth_sessions (
      id            SERIAL PRIMARY KEY,
      token         TEXT NOT NULL UNIQUE,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
      last_used_at  TIMESTAMPTZ,
      debug_role_id UUID REFERENCES roles(id) ON DELETE SET NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS oauth_sessions_token_idx ON oauth_sessions(token)`;
  // Add debug_role_id to existing installations
  await sql`
    ALTER TABLE oauth_sessions ADD COLUMN IF NOT EXISTS debug_role_id UUID REFERENCES roles(id) ON DELETE SET NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS intake_sessions (
      session_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_slug         TEXT NOT NULL,
      practitioner_id       TEXT,
      status                TEXT NOT NULL DEFAULT 'awaiting_intake'
                              CHECK (status IN ('awaiting_intake', 'intake_complete')),
      answers               JSONB,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      submitted_at          TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS intake_sessions_status_idx ON intake_sessions(status)`;

  await sql`
    CREATE TABLE IF NOT EXISTS feedback_sessions (
      session_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content_type  TEXT NOT NULL CHECK (content_type IN ('methodology', 'template')),
      content_slug  TEXT NOT NULL,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status        TEXT NOT NULL DEFAULT 'awaiting_answers'
                      CHECK (status IN ('awaiting_answers', 'complete')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS feedback_sessions_user_idx ON feedback_sessions(user_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS alexandria_request_log (
      id                SERIAL PRIMARY KEY,
      user_id           TEXT NOT NULL,
      permission_tier   TEXT,
      tool_name         TEXT NOT NULL,
      request_summary   TEXT,
      matched_capability BOOLEAN,
      capability_type   TEXT,
      capability_id     TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS request_log_user_idx ON alexandria_request_log(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS request_log_tool_idx ON alexandria_request_log(tool_name)`;
  await sql`CREATE INDEX IF NOT EXISTS request_log_matched_idx ON alexandria_request_log(matched_capability)`;

  await sql`
    CREATE TABLE IF NOT EXISTS production_feedback (
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
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS production_feedback_content_idx ON production_feedback(content_type, content_slug)`;
  await sql`CREATE INDEX IF NOT EXISTS production_feedback_user_idx ON production_feedback(user_id)`;
  // Migrate old boolean columns to new multiple-choice answer columns
  await sql`ALTER TABLE production_feedback ADD COLUMN IF NOT EXISTS editing_needed TEXT`;
  await sql`ALTER TABLE production_feedback ADD COLUMN IF NOT EXISTS shortfalls TEXT[]`;
  await sql`ALTER TABLE production_feedback ADD COLUMN IF NOT EXISTS intake_adequate TEXT`;
  await sql`ALTER TABLE production_feedback ADD COLUMN IF NOT EXISTS would_use_again TEXT`;
  await sql`ALTER TABLE production_feedback DROP COLUMN IF EXISTS quality_score`;
  await sql`ALTER TABLE production_feedback DROP COLUMN IF EXISTS content_accurate`;
  await sql`ALTER TABLE production_feedback DROP COLUMN IF EXISTS brand_applied`;
  await sql`ALTER TABLE production_feedback DROP COLUMN IF EXISTS needed_rework`;

  // ── Step 5: Permissions matrix ──────────────────────────────────────────────
  await sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS portal_access BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS mcp_access BOOLEAN NOT NULL DEFAULT TRUE
  `;

  await sql`
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
  await sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions')
         AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        ALTER TABLE permissions RENAME TO role_permissions;
      END IF;
    END
    $$
  `;

  await sql`
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

  await sql`
    CREATE TABLE IF NOT EXISTS user_roles (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      granted_by INTEGER REFERENCES users(id),
      granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, role_id)
    )
  `;

  // User-level permission overrides (grant / deny — always wins over role)
  await sql`
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

  // Org config singleton — stores default_role_id for new user assignment
  await sql`
    CREATE TABLE IF NOT EXISTS org_config (
      id              INTEGER PRIMARY KEY DEFAULT 1,
      default_role_id UUID REFERENCES roles(id),
      CHECK (id = 1)
    )
  `;

  // Rename account_type column and add if needed
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'user' CHECK (account_type IN ('owner', 'admin', 'user'))`;

  await sql`CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS role_permissions_role_idx ON role_permissions(role_id)`;
  await sql`CREATE INDEX IF NOT EXISTS user_permissions_user_idx ON user_permissions(user_id)`;

  // Seed system roles — Editor and Practitioner are the two canonical roles
  await sql`
    INSERT INTO roles (slug, display_name, description, is_system) VALUES
      ('editor',       'Editor',       'Elevated production access. Write access scoped to own practice.', TRUE),
      ('practitioner', 'Practitioner', 'Standard production access. Platform default for new users.', TRUE)
    ON CONFLICT (slug) DO NOTHING
  `;

  // Seed org_config pointing to practitioner as default role
  await sql`
    INSERT INTO org_config (id, default_role_id)
    SELECT 1, r.id FROM roles r WHERE r.slug = 'practitioner'
    ON CONFLICT (id) DO NOTHING
  `;

  // Seed permissions for editor role (idempotent)
  await sql`
    WITH r AS (SELECT id FROM roles WHERE slug = 'editor')
    INSERT INTO role_permissions (role_id, action, scope) SELECT r.id, v.action, v.scope FROM r,
    (VALUES
      ('methodology:read',                                  'all'),
      ('methodology:write',                                 'own_practice'),
      ('methodology:update',                                'own_practice'),
      ('brand_package:read',                                'all'),
      ('brand_package:write',                               'own_practice'),
      ('brand_package:update',                              'own_practice'),
      ('capability_record:read',                            'all'),
      ('capability_record:write',                           'own_practice'),
      ('capability_record:update',                          'own_practice'),
      ('mcp_tool:alexandria_save_brand_package',            'own_practice'),
      ('mcp_tool:alexandria_update_capability',             'own_practice'),
      ('portal:access',                                     'own_practice'),
      ('portal:dashboard',                                  'own_practice'),
      ('methodology_field:systemInstructions',              'all'),
      ('methodology_field:visionOfGood',                    'all'),
      ('methodology_field:tips',                            'all'),
      ('methodology_field:checkPrompt',                     'all')
    ) AS v(action, scope)
    ON CONFLICT (role_id, action) DO NOTHING
  `;

  // Seed permissions for practitioner role (idempotent)
  await sql`
    WITH r AS (SELECT id FROM roles WHERE slug = 'practitioner')
    INSERT INTO role_permissions (role_id, action, scope) SELECT r.id, v.action, v.scope FROM r,
    (VALUES
      ('methodology:read',         'own_practice'),
      ('brand_package:read',       'all'),
      ('capability_record:read',   'own_practice'),
      ('template:read',            'own_practice'),
      ('portal:access',            'none'),
      ('mcp_tool:standard_production', 'own_practice')
    ) AS v(action, scope)
    ON CONFLICT (role_id, action) DO NOTHING
  `;

  // Backfill account_type from legacy tier column if it exists
  await sql`
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

  // Backfill user_roles from existing users for legacy editor-equivalent (practice_leader) users
  await sql`
    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id
    FROM users u
    JOIN roles r ON r.slug = 'practitioner'
    WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id)
    ON CONFLICT (user_id, role_id) DO NOTHING
  `;
}

migrate().catch((err) => console.error("Migration error:", err));

// ── Request Logging ───────────────────────────────────────────────────────────

async function logRequest(opts: {
  userId: number;
  accountType: string;
  toolName: string;
  requestSummary?: string;
  matchedCapability?: boolean;
  capabilityType?: string;
  capabilityId?: string;
}) {
  try {
    await sql`
      INSERT INTO alexandria_request_log
        (user_id, permission_tier, tool_name, request_summary, matched_capability, capability_type, capability_id)
      VALUES
        (${opts.userId.toString()}, ${opts.accountType}, ${opts.toolName},
         ${opts.requestSummary ?? null}, ${opts.matchedCapability ?? null},
         ${opts.capabilityType ?? null}, ${opts.capabilityId ?? null})
    `;
  } catch (err) {
    // Logging must never break tool execution
    console.error("Request log error:", err);
  }
}

// ── Permissions resolver ──────────────────────────────────────────────────────
// Resolves whether a user has permission to perform an action.
// Caches results for the duration of a single request via the returned Map.
// Do NOT share this cache across requests.

type PermissionScope = "own_practice" | "all" | "none";

interface ResolvedPermission {
  allowed: boolean;
  scope: PermissionScope;
}

function makePermissionResolver(auth: AuthResult) {
  const { userId, accountType, debugRoleId } = auth;
  const cache = new Map<string, ResolvedPermission>();

  return async function checkPermission(action: string): Promise<ResolvedPermission> {
    if (cache.has(action)) return cache.get(action)!;

    // Owners get all permissions unconditionally — unless they are in debug mode
    // (debug mode lets them impersonate a role to test its permission set).
    if (accountType === "owner" && !debugRoleId) {
      const result: ResolvedPermission = { allowed: true, scope: "all" };
      cache.set(action, result);
      return result;
    }

    let result: ResolvedPermission;

    if (debugRoleId) {
      // Debug mode: resolve permissions for the chosen debug role only, ignoring the user's
      // own roles and any user-level overrides. This gives a clean impersonation.
      const [row] = await sql<{ scope: string }[]>`
        SELECT scope FROM role_permissions
        WHERE role_id = ${debugRoleId} AND action = ${action}
        LIMIT 1
      `;
      result = row
        ? { allowed: row.scope !== "none", scope: row.scope as PermissionScope }
        : { allowed: false, scope: "none" };
    } else {
      // Normal resolution:
      // Step 1: collect role-granted permissions (best scope wins across multiple roles)
      const roleRows = await sql<{ scope: string }[]>`
        SELECT rp.scope
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        WHERE ur.user_id = ${userId}
          AND rp.action = ${action}
      `;

      // Step 2: get user-level override (grant or deny)
      const [override] = await sql<{ type: string; scope: string }[]>`
        SELECT type, scope
        FROM user_permissions
        WHERE user_id = ${userId}
          AND action = ${action}
        LIMIT 1
      `;

      if (override) {
        if (override.type === "deny") {
          result = { allowed: false, scope: "none" };
        } else {
          result = { allowed: true, scope: override.scope as PermissionScope };
        }
      } else if (roleRows.length > 0) {
        const scopeRank: Record<string, number> = { all: 2, own_practice: 1, none: 0 };
        const best = roleRows.reduce((a, b) =>
          (scopeRank[b.scope] ?? 0) > (scopeRank[a.scope] ?? 0) ? b : a
        );
        result = {
          allowed: best.scope !== "none",
          scope: best.scope as PermissionScope,
        };
      } else {
        result = { allowed: false, scope: "none" };
      }
    }

    cache.set(action, result);
    return result;
  };
}

// ── Sanity ────────────────────────────────────────────────────────────────────

const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: SANITY_API_TOKEN,
  useCdn: false,
});

// ── Auth ──────────────────────────────────────────────────────────────────────

interface AuthResult {
  userId: number;
  accountType: "owner" | "admin" | "user";
  practice: string | null;
  sessionId: number | null;
  debugRoleId: string | null;
}

async function resolveApiKey(apiKey: string): Promise<AuthResult | null> {
  const keyHash = createHash("sha256").update(apiKey).digest("hex");
  const [row] = await sql`
    SELECT k.id AS key_id, u.id AS user_id, u.account_type, u.practice
    FROM api_keys k
    JOIN users u ON u.id = k.user_id
    WHERE k.key_hash = ${keyHash}
  `;
  if (!row) return null;

  await sql`UPDATE api_keys SET last_used_at = NOW() WHERE id = ${row.key_id}`;

  return {
    userId: row.user_id as number,
    accountType: row.account_type as "owner" | "admin" | "user",
    practice: row.practice as string | null,
    sessionId: null,
    debugRoleId: null,
  };
}

async function resolveOAuthSession(token: string): Promise<AuthResult | null> {
  const [row] = await sql`
    SELECT s.id AS session_id, s.debug_role_id, u.id AS user_id, u.account_type, u.practice
    FROM oauth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
  `;
  if (!row) return null;

  await sql`UPDATE oauth_sessions SET last_used_at = NOW() WHERE id = ${row.session_id}`;

  return {
    userId: row.user_id as number,
    accountType: row.account_type as "owner" | "admin" | "user",
    practice: row.practice as string | null,
    sessionId: row.session_id as number,
    debugRoleId: (row.debug_role_id as string | null) ?? null,
  };
}

async function resolveAuth(req: IncomingMessage): Promise<AuthResult | null> {
  const authHeader = req.headers["authorization"] ?? "";
  const urlObj = new URL(req.url!, `http://localhost`);

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    // Try OAuth session token first, fall back to API key
    const oauthResult = await resolveOAuthSession(token);
    if (oauthResult) return oauthResult;
    return resolveApiKey(token);
  }

  // Legacy: ?key= query param (API key fallback)
  const key = urlObj.searchParams.get("key") ?? "";
  if (key) return resolveApiKey(key);

  return null;
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────
// Our MCP server acts as the OAuth authorization server for Claude.
// Claude → our /authorize → Azure AD → our /oauth/callback → Claude's callback → our /token → access token

// Temporary store for pending OAuth flows (in-memory; short-lived)
const pendingFlows = new Map<string, {
  claudeRedirectUri: string;
  claudeState: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  expiresAt: number;
}>();

// Temporary store for auth codes we've issued to Claude (in-memory; short-lived)
const pendingCodes = new Map<string, {
  userId: number;
  codeChallenge: string;
  expiresAt: number;
}>();

async function exchangeAzureCodeForProfile(code: string): Promise<{
  objectId: string;
  email: string;
  name: string;
  groups: string[];
} | null> {
  const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: AZURE_CLIENT_ID!,
    client_secret: AZURE_CLIENT_SECRET!,
    code,
    redirect_uri: `${MCP_BASE_URL}/oauth/callback`,
    grant_type: "authorization_code",
    scope: "openid profile email User.Read GroupMember.Read.All",
  });

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    console.error("Azure token exchange failed:", await tokenRes.text());
    return null;
  }

  const tokens = await tokenRes.json() as { access_token: string };

  // Fetch profile and group membership in parallel
  const [graphRes, groupsRes] = await Promise.all([
    fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }),
    fetch("https://graph.microsoft.com/v1.0/me/memberOf?$select=id", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }),
  ]);

  if (!graphRes.ok) {
    console.error("Graph API /me failed:", await graphRes.text());
    return null;
  }

  const profile = await graphRes.json() as {
    id: string;
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
  };

  let groups: string[] = [];
  if (groupsRes.ok) {
    const groupsData = await groupsRes.json() as { value: { id: string }[] };
    groups = groupsData.value.map((g) => g.id);
  } else {
    console.warn("Could not fetch group membership:", await groupsRes.text());
  }

  return {
    objectId: profile.id,
    email: profile.mail ?? profile.userPrincipalName ?? "",
    name: profile.displayName ?? "",
    groups,
  };
}

async function upsertUser(objectId: string, email: string, name: string): Promise<number> {
  // Check if an owner already exists before inserting
  const [ownerCheck] = await sql`SELECT id FROM users WHERE account_type = 'owner' LIMIT 1`;
  const isFirstUser = !ownerCheck;

  const [user] = await sql`
    INSERT INTO users (object_id, email, name, account_type, created_at)
    VALUES (${objectId}, ${email}, ${name}, ${isFirstUser ? "owner" : "user"}, NOW())
    ON CONFLICT (object_id)
    DO UPDATE SET
      email        = EXCLUDED.email,
      name         = EXCLUDED.name,
      last_seen_at = NOW()
    RETURNING id, created_at, last_seen_at
  `;

  // Assign default role only to brand-new users (detect via created_at ≈ last_seen_at)
  const isNewUser = Math.abs(
    new Date(user.created_at as string).getTime() -
    new Date(user.last_seen_at as string).getTime()
  ) < 2000;

  if (isNewUser) {
    await sql`
      INSERT INTO user_roles (user_id, role_id)
      SELECT ${user.id as number}, oc.default_role_id
      FROM org_config oc
      WHERE oc.default_role_id IS NOT NULL
      ON CONFLICT (user_id, role_id) DO NOTHING
    `;
  }

  return user.id as number;
}

async function createSessionToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await sql`INSERT INTO oauth_sessions (token, user_id) VALUES (${token}, ${userId})`;
  return token;
}

// ── Server factory ────────────────────────────────────────────────────────────
// One McpServer per request, scoped to the authenticated user's tier.

function buildServer(auth: AuthResult): McpServer {
  const server = new McpServer({
    name: "alexandria",
    version: "0.2.0",
  });

  const checkPermission = makePermissionResolver(auth);

  // ── alexandria_list_methodologies ─────────────────────────────────────────
  server.tool(
    "alexandria_list_methodologies",
    "List production methodologies from Alexandria. Methodologies describe HOW to produce a deliverable — the process, steps, and instructions. This does NOT return templates. For deliverable format templates (HTML pages, Word documents, presentations), use alexandria_list_templates instead. Optionally filter by practice area. Returns name, slug, AI classification, and proven status.",
    {
      practice: z.string().optional().describe("Practice area slug to filter by (e.g. 'brand-strategy', 'content-marketing')"),
    },
    async ({ practice }) => {
      // Apply practice scoping: if user's methodology:read scope is own_practice and they
      // have a practice assigned, filter to their practice (unless they specified a practice).
      const methPerm = await checkPermission("methodology:read");
      const effectivePractice = practice
        ?? (methPerm.scope === "own_practice" && auth.practice ? auth.practice : undefined);

      let query: string;
      let params: Record<string, unknown>;

      if (effectivePractice) {
        query = `*[_type == "productionMethodology" && practice->slug.current == $practice] | order(name asc) {
          _id, name, "slug": slug.current, aiClassification, provenStatus, version,
          "practice": practice->name
        }`;
        params = { practice: effectivePractice };
      } else {
        query = `*[_type == "productionMethodology"] | order(name asc) {
          _id, name, "slug": slug.current, aiClassification, provenStatus, version,
          "practice": practice->name
        }`;
        params = {};
      }

      const rows = await sanity.fetch(query, params);

      if (!rows || rows.length === 0) {
        return { content: [{ type: "text", text: "No methodologies found." }] };
      }

      const text = rows.map((m: Record<string, unknown>) =>
        `• ${m.name} [${m.slug}]\n  Practice: ${m.practice ?? "Unassigned"} | Classification: ${m.aiClassification ?? "—"} | Status: ${m.provenStatus ?? "—"} | v${m.version ?? "1.0"}`
      ).join("\n\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // ── alexandria_get_methodology ─────────────────────────────────────────────
  server.tool(
    "alexandria_get_methodology",
    "Get the production methodology for a specific deliverable type. Returns instructions, steps, quality checks, and required inputs. Use this when a practitioner needs to produce a specific deliverable. The slug parameter accepts the exact slug OR a plain-english name — it will match either. If unsure of the slug, call alexandria_list_methodologies first to see what's available. Approval gate prompts must be presented verbatim — do not paraphrase or summarize them.",
    {
      slug: z.string().describe("The methodology slug OR a plain-english name (e.g. 'post discovery brief', 'brand package extraction', 'post_discovery_brief'). Hyphens, underscores, and spaces are all accepted."),
    },
    async ({ slug }) => {
      // Normalize: collapse hyphens/spaces to underscores for slug matching,
      // and keep original for name matching
      const normalizedSlug = slug.trim().toLowerCase().replace(/[-\s]+/g, "_");

      const query = `*[_type == "productionMethodology" && (
        slug.current == $slug ||
        slug.current == $normalizedSlug ||
        lower(name) == $lowerName ||
        lower(name) match $namePattern
      )][0] {
        _id, name, "slug": slug.current, description,
        "practice": practice->{ name, "slug": slug.current },
        aiClassification, toolsInvolved, requiredInputs,
        systemInstructions, steps, outputFormat,
        qualityChecks, qualityChecklist, failureModes, visionOfGood, tips,
        clientRefinements, provenStatus, baselineProductionTime, aiNativeProductionTime,
        version, author, validatedBy, includeFeedbackPrompt
      }`;

      const lowerName = slug.trim().toLowerCase();
      const namePattern = `*${lowerName}*`;

      const m = await sanity.fetch(query, { slug, normalizedSlug, lowerName, namePattern });

      if (!m) {
        return { content: [{ type: "text", text: `No methodology found for slug: ${slug}` }], isError: true };
      }

      const lines: string[] = [];

      lines.push(`# ${m.name}`);
      if (m.description) lines.push(`\n${m.description}`);
      lines.push(`\n**Practice:** ${m.practice?.name ?? "Unassigned"}`);
      lines.push(`**Classification:** ${m.aiClassification ?? "—"} | **Status:** ${m.provenStatus ?? "—"} | **Version:** ${m.version ?? "1.0"}`);
      if (m.toolsInvolved?.length) lines.push(`**Tools:** ${m.toolsInvolved.join(", ")}`);

      if (m.requiredInputs?.length) {
        lines.push("\n## Required Inputs");
        for (const input of m.requiredInputs) {
          lines.push(`- **${input.name}**${input.required ? " (required)" : " (optional)"}`);
          if (input.description) lines.push(`  ${input.description}`);
          if (input.promptText) lines.push(`  → Claude asks: "${input.promptText}"`);
        }
      }

      // systemInstructions, visionOfGood, tips, checkPrompt — permission-gated fields
      const [canSeeSystemInstructions, canSeeVisionOfGood, canSeeTips, canSeeCheckPrompt] = await Promise.all([
        checkPermission("methodology_field:systemInstructions"),
        checkPermission("methodology_field:visionOfGood"),
        checkPermission("methodology_field:tips"),
        checkPermission("methodology_field:checkPrompt"),
      ]);

      if (m.systemInstructions) {
        if (canSeeSystemInstructions.allowed) {
          lines.push("\n## System Instructions (FULL — Admin/Practice Leader Access)");
          lines.push(m.systemInstructions);
        } else {
          lines.push("\n## System Instructions");
          lines.push("_System instructions are available to practice leaders and administrators only. To execute this methodology, ask Alexandria to run it for you — Claude will apply the full methodology without exposing the instructions directly._");
        }
      }

      if (m.steps?.length) {
        // Fetch feedback prompt once if needed, inject into last step's instructions
        let feedbackPromptText: string | null = null;
        if (m.includeFeedbackPrompt) {
          const guide = await sanity.fetch<{ feedbackPrompt?: string }>(
            `*[_id == "platformGuide"][0]{ feedbackPrompt }`
          );
          feedbackPromptText = guide?.feedbackPrompt ?? "To give feedback on this methodology, say: **Alexandria, give feedback**. It takes 30 seconds and helps the practice team improve these tools.";
        }

        lines.push("\n## Steps");
        const steps = m.steps as Record<string, unknown>[];
        steps.forEach((step, i) => {
          lines.push(`\n### Step ${i + 1}: ${step.name}`);
          let instructions = (step.instructions as string) ?? "";
          // Inject feedback prompt into last step's instructions at render time
          if (feedbackPromptText && i === steps.length - 1) {
            instructions = instructions
              ? `${instructions}\n\nAfter delivering the output, present this to the practitioner verbatim:\n\n> ${feedbackPromptText}`
              : `After delivering the output, present this to the practitioner verbatim:\n\n> ${feedbackPromptText}`;
          }
          if (instructions) lines.push(instructions);
          if (step.approvalGate) {
            lines.push(`⏸ **Approval gate** — pause for practitioner review`);
            if (step.gatePrompt) lines.push(`Gate prompt: "${step.gatePrompt}"`);
            if (step.iterationProtocol) lines.push(`Iteration: ${step.iterationProtocol}`);
          }
        });
      }

      if (m.outputFormat) {
        lines.push("\n## Output Format");
        lines.push(m.outputFormat);
      }

      if (m.qualityChecks?.length) {
        lines.push("\n## Quality Checks");
        for (const qc of m.qualityChecks as Record<string, string>[]) {
          lines.push(`- **${qc.name}**`);
          if (qc.description) lines.push(`  ${qc.description}`);
          if (canSeeCheckPrompt.allowed && qc.checkPrompt) lines.push(`  Internal check: "${qc.checkPrompt}"`);
        }
      }

      if (m.visionOfGood && canSeeVisionOfGood.allowed) {
        lines.push("\n## Vision of Good");
        lines.push(m.visionOfGood);
      }

      if (m.failureModes?.length) {
        lines.push("\n## Common Failure Modes");
        for (const fm of m.failureModes as Record<string, string>[]) {
          lines.push(`- **${fm.name}**`);
          if (fm.description) lines.push(`  ${fm.description}`);
          if (fm.mitigation) lines.push(`  Mitigation: ${fm.mitigation}`);
        }
      }

      if (m.tips && canSeeTips.allowed) {
        lines.push("\n## Tips");
        lines.push(m.tips as string);
      }

      if (m.clientRefinements?.length) {
        lines.push("\n## Client Refinements");
        for (const cr of m.clientRefinements as Record<string, string>[]) {
          lines.push(`- **${cr.client}**`);
          if (cr.refinementText) lines.push(`  ${cr.refinementText}`);
          if (cr.context) lines.push(`  Context: ${cr.context}`);
        }
      }

      if (m.baselineProductionTime || m.aiNativeProductionTime) {
        lines.push("\n## Production Time");
        if (m.baselineProductionTime) lines.push(`Legacy: ${m.baselineProductionTime}`);
        if (m.aiNativeProductionTime) lines.push(`AI-native: ${m.aiNativeProductionTime}`);
      }

      // Quality checklist — appended as a handoff block AFTER production output
      if (m.qualityChecklist?.length) {
        const tierLabel: Record<string, string> = { practitioner: "Practitioner", practice_leader: "Practice Leader", gatekeeper: "Gatekeeper" };
        lines.push("\n---\n## Before This Goes Downstream");
        lines.push("A human must verify the following before this output is shared with a client or used in production:\n");
        for (const gate of m.qualityChecklist as Record<string, string>[]) {
          lines.push(`☐ **${gate.gate}** *(${tierLabel[gate.tier] ?? gate.tier})* — ${gate.description ?? ""}`);
        }
      }


      logRequest({ userId: auth.userId, accountType: auth.accountType, toolName: "alexandria_get_methodology", requestSummary: `Get methodology: ${slug}`, matchedCapability: true, capabilityType: "methodology", capabilityId: slug });
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── alexandria_list_practice_areas ────────────────────────────────────────
  server.tool(
    "alexandria_list_practice_areas",
    "List all JDA practice areas in Alexandria.",
    {},
    async () => {
      const rows = await sanity.fetch(
        `*[_type == "practiceArea"] | order(name asc) { _id, name, "slug": slug.current, activationStatus }`,
        {}
      );

      if (!rows || rows.length === 0) {
        return { content: [{ type: "text", text: "No practice areas found." }] };
      }

      const text = rows.map((p: Record<string, unknown>) =>
        `• ${p.name} [${p.slug}] — ${p.activationStatus ?? "—"}`
      ).join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // ── alexandria_list_deliverables ──────────────────────────────────────────
  server.tool(
    "alexandria_list_deliverables",
    "List deliverable classifications from Alexandria. Optionally filter by practice area.",
    {
      practice: z.string().optional().describe("Practice area slug to filter by"),
    },
    async ({ practice }) => {
      let query: string;
      let params: Record<string, unknown>;

      if (practice) {
        query = `*[_type == "deliverableClassification" && practiceArea->slug.current == $practice] | order(name asc) {
          _id, name, "slug": slug.current, aiClassification, "practiceArea": practiceArea->name
        }`;
        params = { practice };
      } else {
        query = `*[_type == "deliverableClassification"] | order(name asc) {
          _id, name, "slug": slug.current, aiClassification, "practiceArea": practiceArea->name
        }`;
        params = {};
      }

      const rows = await sanity.fetch(query, params);

      if (!rows || rows.length === 0) {
        return { content: [{ type: "text", text: "No deliverable classifications found." }] };
      }

      const text = rows.map((d: Record<string, unknown>) =>
        `• ${d.name} [${d.slug}] — ${d.aiClassification ?? "—"} | Practice: ${d.practiceArea ?? "Unassigned"}`
      ).join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // ── alexandria_list_brand_packages ───────────────────────────────────────
  server.tool(
    "alexandria_list_brand_packages",
    "List all client brand packages available in Alexandria. Use this during Brand Resolution to check whether a brand package exists for a given client before asking the practitioner for a brand guide.",
    {},
    async () => {
      const rows = await sanity.fetch(
        `*[_type == "clientBrandPackage"] | order(clientName asc) {
          _id, clientName, "slug": slug.current, extractedDate, sourceDocument, extractedBy, gaps
        }`,
        {}
      );

      if (!rows || rows.length === 0) {
        return { content: [{ type: "text", text: "No client brand packages found in Alexandria." }] };
      }

      const text = rows.map((p: Record<string, unknown>) => {
        const lines = [`• ${p.clientName} [${p.slug}]`];
        if (p.sourceDocument) lines.push(`  Source: ${p.sourceDocument}`);
        if (p.extractedDate) lines.push(`  Extracted: ${p.extractedDate}`);
        if (p.extractedBy) lines.push(`  By: ${p.extractedBy}`);
        if (p.gaps) lines.push(`  ⚠ Gaps: ${p.gaps}`);
        return lines.join("\n");
      }).join("\n\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // ── alexandria_get_brand_package ──────────────────────────────────────────
  server.tool(
    "alexandria_get_brand_package",
    "Get the full brand package for a specific client from Alexandria. Returns the complete brand system — colors, typography, voice, messaging, and architecture restrictions — as a structured markdown document. Use this during Brand Resolution when a package exists for the client. Accepts the slug OR the client name — hyphens, underscores, and spaces are all accepted.",
    {
      slug: z.string().describe("The client slug OR client name (e.g. 'heartbeat-international', 'Heartbeat International', 'heartbeat_international'). Hyphens, underscores, and spaces are all accepted."),
    },
    async ({ slug }) => {
      const normalizedSlug = slug.trim().toLowerCase().replace(/[\s_]+/g, "-");
      const lowerName = slug.trim().toLowerCase();

      const p = await sanity.fetch(
        `*[_type == "clientBrandPackage" && (
          slug.current == $slug ||
          slug.current == $normalizedSlug ||
          lower(clientName) == $lowerName ||
          lower(clientName) match $namePattern
        )][0] {
          _id, clientName, "slug": slug.current, abbreviations,
          extractedDate, sourceDocument, extractedBy, gaps,
          rawMarkdown,
          logos[]{ variant, onBackground, svgCode, "imageUrl": imageFile.asset->url, notes },
          logoUsageRules,
          webFonts[]{ role, familyName, source, linkTag, cssStack, webSubstitute },
          templateOverrides,
          identity, colorPalette, colorUsageRules,
          typography, voiceAndTone, brandArchitecture,
          visualDirection, keyMessaging
        }`,
        { slug, normalizedSlug, lowerName, namePattern: `*${lowerName}*` }
      );

      if (!p) {
        return {
          content: [{ type: "text", text: `No brand package found for client slug: ${slug}. Use alexandria_list_brand_packages to see available clients.` }],
          isError: true,
        };
      }

      // Build logo section — multiple variants
      const logoLines: string[] = [];
      interface LogoVariant { variant: string; onBackground?: string; svgCode?: string; imageUrl?: string; notes?: string; }
      if (p.logos?.length) {
        logoLines.push("## Logo Variants");
        if (p.logoUsageRules) {
          logoLines.push(`**Usage rules:** ${p.logoUsageRules}\n`);
        }
        for (const logo of p.logos as LogoVariant[]) {
          const label = [logo.variant, logo.onBackground ? `(${logo.onBackground} backgrounds)` : ""].filter(Boolean).join(" ");
          logoLines.push(`### ${label}`);
          if (logo.notes) logoLines.push(`*${logo.notes}*`);
          if (logo.svgCode) {
            logoLines.push("SVG — embed inline:");
            logoLines.push(logo.svgCode);
          } else if (logo.imageUrl) {
            logoLines.push(`Image URL: ${logo.imageUrl}`);
          }
        }
      }

      // Build web fonts section
      const fontLines: string[] = [];
      interface WebFont { role: string; familyName: string; source?: string; linkTag?: string; cssStack: string; webSubstitute?: string; }
      if (p.webFonts?.length) {
        fontLines.push("## Web Font Injection");
        fontLines.push("Paste all link tags into <head> before any other styles. Use cssStack values for font-family declarations.\n");
        const linkTags = (p.webFonts as WebFont[]).filter(f => f.linkTag).map(f => f.linkTag);
        if (linkTags.length) {
          fontLines.push("**Link tags (paste into <head>):**");
          fontLines.push("```html");
          fontLines.push(...linkTags as string[]);
          fontLines.push("```");
        }
        fontLines.push("\n**CSS font-family values:**");
        for (const f of p.webFonts as WebFont[]) {
          fontLines.push(`- **${f.role}** (${f.familyName}): \`${f.cssStack}\``);
          if (f.webSubstitute) fontLines.push(`  *(Web substitute: ${f.webSubstitute})*`);
        }
      }

      // Build template overrides section
      const overrideLines: string[] = [];
      if (p.templateOverrides) {
        overrideLines.push("## ⚠ Brand Template Overrides");
        overrideLines.push("Apply these rules on top of any base template. These are non-negotiable for this brand.");
        overrideLines.push(p.templateOverrides);
      }

      if (p.rawMarkdown) {
        const header = [
          `# ${p.clientName} — Brand Package`,
          p.abbreviations ? `**Abbreviations:** ${p.abbreviations}` : null,
          p.sourceDocument ? `**Source:** ${p.sourceDocument}` : null,
          p.extractedDate ? `**Extracted:** ${p.extractedDate}` : null,
          p.gaps ? `\n⚠ **Extraction gaps:** ${p.gaps}` : null,
          "\n---\n",
        ].filter(Boolean).join("\n");

        const logoSection = logoLines.length > 0 ? "\n" + logoLines.join("\n") + "\n\n---\n\n" : "";
        const fontSection = fontLines.length > 0 ? fontLines.join("\n") + "\n\n---\n\n" : "";
        const overrideSection = overrideLines.length > 0 ? overrideLines.join("\n") + "\n\n---\n\n" : "";
        logRequest({ userId: auth.userId, accountType: auth.accountType, toolName: "alexandria_get_brand_package", requestSummary: `Get brand package: ${slug}`, matchedCapability: true, capabilityType: "brand_package", capabilityId: slug });
        return { content: [{ type: "text", text: header + overrideSection + fontSection + logoSection + p.rawMarkdown }] };
      }

      // Fallback: build from structured fields
      const lines: string[] = [];
      lines.push(`# ${p.clientName} — Brand Package`);
      if (p.abbreviations) lines.push(`**Abbreviations:** ${p.abbreviations}`);
      if (p.sourceDocument) lines.push(`**Source:** ${p.sourceDocument}`);
      if (p.extractedDate) lines.push(`**Extracted:** ${p.extractedDate}`);
      if (p.gaps) lines.push(`\n⚠ **Extraction gaps:** ${p.gaps}`);
      if (overrideLines.length > 0) lines.push("\n" + overrideLines.join("\n"));
      if (fontLines.length > 0) lines.push("\n" + fontLines.join("\n"));
      if (logoLines.length > 0) lines.push("\n" + logoLines.join("\n"));

      const id = p.identity as Record<string, string> | null;
      if (id) {
        lines.push("\n## Identity");
        if (id.tagline) lines.push(`**Tagline:** ${id.tagline}`);
        if (id.brandPersonality) lines.push(`**Personality:** ${id.brandPersonality}`);
        if (id.brandVoice) lines.push(`**Voice:** ${id.brandVoice}`);
        if (id.brandExperience) lines.push(`**Experience:** ${id.brandExperience}`);
      }

      if (p.colorPalette?.length) {
        lines.push("\n## Color Palette");
        lines.push("| Color | Hex | Role | Notes |");
        lines.push("|---|---|---|---|");
        for (const c of p.colorPalette as Record<string, string>[]) {
          lines.push(`| ${c.colorName} | ${c.hex ?? "—"} | ${c.role ?? "—"} | ${c.usageNotes ?? ""} |`);
        }
        if (p.colorUsageRules) lines.push(`\n${p.colorUsageRules}`);
      }

      const typo = p.typography as Record<string, string> | null;
      if (typo) {
        lines.push("\n## Typography");
        if (typo.headingFont) lines.push(`**Heading:** ${typo.headingFont}`);
        if (typo.bodyFont) lines.push(`**Body:** ${typo.bodyFont}`);
        if (typo.accentFont) lines.push(`**Accent/Display:** ${typo.accentFont}`);
        if (typo.pairingRules) lines.push(`**Pairing:** ${typo.pairingRules}`);
        if (typo.alignmentRules) lines.push(`**Alignment:** ${typo.alignmentRules}`);
        if (typo.webFontAvailability) lines.push(`**Web fonts:** ${typo.webFontAvailability}`);
        if (typo.officeAlternatives) lines.push(`**Office alternatives:** ${typo.officeAlternatives}`);
      }

      const vt = p.voiceAndTone as Record<string, string> | null;
      if (vt) {
        lines.push("\n## Voice and Tone");
        if (vt.overallVoice) lines.push(`**Voice:** ${vt.overallVoice}`);
        if (vt.toneByAudience) lines.push(`\n**By audience:**\n${vt.toneByAudience}`);
        if (vt.toneByContext) lines.push(`\n**By context:**\n${vt.toneByContext}`);
        if (vt.wordsToUse) lines.push(`\n**Words to use:**\n${vt.wordsToUse}`);
        if (vt.wordsToAvoid) lines.push(`\n**Words to avoid:**\n${vt.wordsToAvoid}`);
        if (vt.writingStyleRules) lines.push(`\n**Style rules:**\n${vt.writingStyleRules}`);
        if (vt.verbalExamples) lines.push(`\n**Examples:**\n${vt.verbalExamples}`);
        if (vt.underminingTraits) lines.push(`\n**Must NOT sound like:**\n${vt.underminingTraits}`);
      }

      const ba = p.brandArchitecture as Record<string, string> | null;
      if (ba) {
        lines.push("\n## Brand Architecture");
        if (ba.parentAndSubBrands) lines.push(ba.parentAndSubBrands);
        if (ba.linkageRules) lines.push(`\n**Linkage:** ${ba.linkageRules}`);
        if (ba.endorsementRules) lines.push(`\n**Endorsement:** ${ba.endorsementRules}`);
        if (ba.criticalRestrictions) lines.push(`\n⛔ **Critical restrictions (DO NOT):**\n${ba.criticalRestrictions}`);
      }

      const vd = p.visualDirection as Record<string, string> | null;
      if (vd) {
        lines.push("\n## Visual Direction");
        if (vd.photographyStyle) lines.push(`**Photography:** ${vd.photographyStyle}`);
        if (vd.imageryGuidelines) lines.push(`**Imagery:** ${vd.imageryGuidelines}`);
        if (vd.layoutPrinciples) lines.push(`**Layout:** ${vd.layoutPrinciples}`);
        if (vd.logoUsageRules) lines.push(`**Logo usage:** ${vd.logoUsageRules}`);
      }

      const km = p.keyMessaging as Record<string, string> | null;
      if (km) {
        lines.push("\n## Key Messaging");
        if (km.missionStatement) lines.push(`\n> **Mission:** ${km.missionStatement}`);
        if (km.visionStatement) lines.push(`\n> **Vision:** ${km.visionStatement}`);
        if (km.valueProposition) lines.push(`\n> **Value proposition:** ${km.valueProposition}`);
        if (km.elevatorSpeeches) lines.push(`\n**Elevator speeches:**\n${km.elevatorSpeeches}`);
        if (km.coreValues) lines.push(`\n**Core values:**\n${km.coreValues}`);
        if (km.keyStatistics) lines.push(`\n**Key statistics:**\n${km.keyStatistics}`);
        if (km.trademarkedNames) lines.push(`\n**Trademarked names:** ${km.trademarkedNames}`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── alexandria_list_templates ─────────────────────────────────────────────
  server.tool(
    "alexandria_list_templates",
    "List available production templates in Alexandria. Use this to find the right template, then you MUST call alexandria_get_template to load the full template before doing any production work — the full template contains required practitioner intake that cannot be skipped. Never build directly from the list response.",
    {
      format_type: z.enum(["html-deliverable", "word-document", "html-email"]).optional().describe("Filter by format type. Omit to return all active templates."),
    },
    async ({ format_type }) => {
      const filter = format_type
        ? `_type == "template" && status == "active" && formatType == $formatType`
        : `_type == "template" && status == "active"`;

      const templates = await sanity.fetch(
        `*[${filter}] | order(title asc) {
          title, "slug": slug.current, formatType,
          previewUrl, useCases, featureList
        }`,
        { formatType: format_type ?? "" }
      );

      if (!templates || templates.length === 0) {
        const filterNote = format_type ? ` with format type "${format_type}"` : "";
        return { content: [{ type: "text", text: `No active templates found in Alexandria${filterNote}.` }] };
      }

      const formatLabels: Record<string, string> = {
        "html-deliverable": "HTML Deliverable (scroll, slide, or tabbed)",
        "word-document":    "Word Document",
        "html-email":       "HTML Email",
      };

      const lines: string[] = [
        `# Alexandria Templates (${templates.length} active)\n`,
        `⚠ **Building a deliverable is a two-step process:** (1) Call \`alexandria_get_template\` to get the practitioner intake questions and collect answers. (2) Call \`alexandria_build_template\` with confirmed answers to get production instructions. Do not skip either step.\n`,
      ];

      for (const t of templates) {
        lines.push(`## ${t.title}`);
        lines.push(`**Slug:** \`${t.slug}\``);
        lines.push(`**Format:** ${formatLabels[t.formatType] ?? t.formatType}`);
        if (t.previewUrl) lines.push(`**Preview:** ${t.previewUrl}`);
        if (t.useCases) lines.push(`\n**Use cases:** ${t.useCases}`);
        if (t.featureList) lines.push(`\n**Features:** ${t.featureList}`);
        lines.push(`\n→ Step 1: Call \`alexandria_get_template\` with slug \`${t.slug}\` to get intake questions.\n→ Step 2: Call \`alexandria_build_template\` with slug and confirmed answers to get production instructions.\n`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── alexandria_get_template ───────────────────────────────────────────────
  server.tool(
    "alexandria_get_template",
    "Step 1 of 3 for building a deliverable. Returns a session_id and the practitioner intake questions. You MUST present ALL intake questions to the practitioner and wait for their answers. Do NOT read source files, fetch brand packages, or call alexandria_build_template until intake is complete. After collecting answers, call alexandria_submit_intake with the session_id and answers. Only then call alexandria_build_template.",
    {
      slug: z.string().describe("The template slug OR plain-english name. Hyphens, underscores, and spaces are all accepted."),
    },
    async ({ slug }) => {
      const normalizedSlug = slug.trim().toLowerCase().replace(/[\s_]+/g, "-");
      const lowerName = slug.trim().toLowerCase();

      const t = await sanity.fetch(
        `*[_type == "template" && (
          slug.current == $slug ||
          slug.current == $normalizedSlug ||
          lower(title) == $lowerName ||
          lower(title) match $namePattern
        )][0] {
          title, "slug": slug.current, formatType, status,
          clientAdaptationNotes
        }`,
        { slug, normalizedSlug, lowerName, namePattern: `*${lowerName}*` }
      );

      if (!t) {
        return {
          content: [{ type: "text", text: `No template found for: "${slug}". Use alexandria_list_templates to see what's available.` }],
          isError: true,
        };
      }

      if (t.status === "deprecated") {
        return {
          content: [{ type: "text", text: `The template "${t.title}" has been deprecated. Use alexandria_list_templates to find a current replacement.` }],
          isError: true,
        };
      }

      // Create intake session in Postgres
      const practitionerId = auth.userId.toString();
      const [session] = await sql<{ session_id: string }[]>`
        INSERT INTO intake_sessions (template_slug, practitioner_id, status)
        VALUES (${t.slug}, ${practitionerId}, 'awaiting_intake')
        RETURNING session_id
      `;

      logRequest({ userId: auth.userId, accountType: auth.accountType, toolName: "alexandria_get_template", requestSummary: `Get template: ${t.slug}`, matchedCapability: true, capabilityType: "template", capabilityId: t.slug });

      const lines: string[] = [
        `# ${t.title} — Practitioner Intake`,
        `\n**Session ID:** \`${session.session_id}\``,
        `*Save this — you will need it to submit answers and unlock production instructions.*\n`,
        `---`,
        `\nPresent ALL of the following intake questions to the practitioner as a single message and wait for a single reply before doing anything else. Do not read any source files or fetch any brand packages yet.`,
        `\nFor questions with discrete lettered options, use an interactive poll widget if available — this lets the practitioner answer with a single click. For open-text questions (client name, source content, audience, purpose, tone, anything else), present them as plain numbered questions. The goal is a single short reply from the practitioner covering all questions at once.\n`,
        `---\n`,
        t.clientAdaptationNotes ?? "No intake questions defined for this template.",
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── alexandria_submit_intake ──────────────────────────────────────────────
  server.tool(
    "alexandria_submit_intake",
    "Step 2 of 3 for building a deliverable. Call this after the practitioner has answered all intake questions. Submits their answers against the session_id from alexandria_get_template, validates completeness, and unlocks the session for building. Returns a confirmation summary — show it to the practitioner and ask them to confirm before calling alexandria_build_template.",
    {
      session_id: z.string().describe("The session_id returned by alexandria_get_template."),
      audience: z.string().describe("Who will see this deliverable and in what context."),
      purpose: z.string().describe("What this deliverable needs to accomplish — the decision or action it should drive."),
      layout_mode: z.enum(["scroll", "slide", "tabbed"]).describe("The chosen layout mode."),
      navigation: z.enum(["smart", "always", "none"]).describe("Navigation preference: smart (include if >8 sections), always, or none."),
      visual_skin: z.string().describe("The chosen visual skin from Stage 2 — encodes both color and section pattern, e.g. 'Prolific dark blue hero with alternating light sections' or 'Full black throughout'."),
      tone: z.string().describe("How the deliverable should feel — the practitioner's own words."),
      cover_framing: z.enum(["internal", "external-jda", "external-client"]).describe("internal = no confidentiality line; external-jda = JDA authored; external-client = client branded."),
      anything_else: z.string().optional().describe("Any additional constraints, verbatim language, sections to avoid, etc."),
    },
    async ({ session_id, audience, purpose, layout_mode, navigation, visual_skin, tone, cover_framing, anything_else }) => {
      // Validate session exists and is awaiting intake
      const [session] = await sql<{ session_id: string; status: string; template_slug: string }[]>`
        SELECT session_id, status, template_slug FROM intake_sessions WHERE session_id = ${session_id}
      `;

      if (!session) {
        return {
          content: [{ type: "text", text: `Session not found: \`${session_id}\`. Call alexandria_get_template to start a new intake session.` }],
          isError: true,
        };
      }

      if (session.status === "intake_complete") {
        return {
          content: [{ type: "text", text: `Session \`${session_id}\` is already complete. Call alexandria_build_template to get production instructions.` }],
          isError: false,
        };
      }

      // Validate answer quality — reject implausibly short answers
      const shortFields = [
        { name: "audience", value: audience },
        { name: "purpose", value: purpose },
        { name: "visual_skin", value: visual_skin },
        { name: "tone", value: tone },
      ].filter(f => f.value.trim().split(/\s+/).length < 3);

      if (shortFields.length > 0) {
        return {
          content: [{ type: "text", text: `The following answers appear incomplete (fewer than 3 words): ${shortFields.map(f => f.name).join(", ")}. Ask the practitioner to provide more specific answers before submitting.` }],
          isError: true,
        };
      }

      const answers = { audience, purpose, layout_mode, navigation, visual_skin, tone, cover_framing, anything_else: anything_else ?? "" };

      await sql`
        UPDATE intake_sessions
        SET status = 'intake_complete', answers = ${JSON.stringify(answers)}, submitted_at = NOW()
        WHERE session_id = ${session_id}
      `;

      const navLabel: Record<string, string> = { smart: "Smart nav (include if >8 sections)", always: "Always include navigation", none: "No navigation" };
      const coverLabel: Record<string, string> = { "internal": "Internal — no confidentiality line", "external-jda": "External — JDA authored", "external-client": "External — client branded" };

      const summary = [
        `## Intake Confirmed — Session \`${session_id}\``,
        ``,
        `Here is what I have. Please confirm this is correct before I build:\n`,
        `**Audience:** ${audience}`,
        `**Purpose:** ${purpose}`,
        `**Layout:** ${layout_mode}`,
        `**Navigation:** ${navLabel[navigation]}`,
        `**Visual skin:** ${visual_skin}`,
        `**Tone:** ${tone}`,
        `**Cover framing:** ${coverLabel[cover_framing]}`,
        anything_else ? `**Additional notes:** ${anything_else}` : "",
        ``,
        `If this looks right, confirm and I will proceed. If anything needs to change, tell me now.`,
        ``,
        `*Once confirmed, call \`alexandria_build_template\` with session_id \`${session_id}\` to receive production instructions.*`,
      ].filter(Boolean).join("\n");

      return { content: [{ type: "text", text: summary }] };
    }
  );

  // ── alexandria_build_template ─────────────────────────────────────────────
  server.tool(
    "alexandria_build_template",
    "Step 3 of 3 for building a deliverable. Call this ONLY after alexandria_submit_intake has been called and the practitioner has confirmed the intake summary. Requires session_id. The server validates session status — calls on sessions still awaiting intake are rejected. Returns full production instructions with confirmed practitioner parameters injected. The response ends with a rating prompt — present it verbatim to the practitioner after delivering the output.",
    {
      slug: z.string().describe("The template slug from alexandria_get_template."),
      session_id: z.string().describe("The session_id from alexandria_get_template. Must correspond to a completed intake session."),
    },
    async ({ slug, session_id }) => {
      // Gate: verify session is complete
      const [session] = await sql<{ status: string; answers: Record<string, string> }[]>`
        SELECT status, answers FROM intake_sessions WHERE session_id = ${session_id}
      `;

      if (!session) {
        return {
          content: [{ type: "text", text: `Session not found: \`${session_id}\`. Call alexandria_get_template to start a new intake session.` }],
          isError: true,
        };
      }

      if (session.status !== "intake_complete") {
        return {
          content: [{ type: "text", text: `Cannot build: session \`${session_id}\` has not completed intake. Call alexandria_submit_intake with the practitioner's confirmed answers first.` }],
          isError: true,
        };
      }

      const a: Record<string, string> = typeof session.answers === "string" ? JSON.parse(session.answers) : session.answers;
      const normalizedSlug = slug.trim().toLowerCase().replace(/[\s_]+/g, "-");
      const lowerName = slug.trim().toLowerCase();

      const t = await sanity.fetch(
        `*[_type == "template" && (
          slug.current == $slug ||
          slug.current == $normalizedSlug ||
          lower(title) == $lowerName ||
          lower(title) match $namePattern
        )][0] {
          title, "slug": slug.current, formatType, status,
          previewUrl, githubRawUrl, dropboxLink,
          useCases, featureList,
          fixedElements, variableElements, brandInjectionRules,
          outputSpec, qualityChecks, includeFeedbackPrompt,
          "practiceAreas": practiceAreas[]->{ name, "slug": slug.current },
          "relatedMethodologies": relatedMethodologies[]->{ name, "slug": slug.current }
        }`,
        { slug, normalizedSlug, lowerName, namePattern: `*${lowerName}*` }
      );

      if (!t) {
        return {
          content: [{ type: "text", text: `No template found for: "${slug}".` }],
          isError: true,
        };
      }

      if (t.status === "deprecated") {
        return {
          content: [{ type: "text", text: `The template "${t.title}" has been deprecated.` }],
          isError: true,
        };
      }

      const formatLabels: Record<string, string> = {
        "html-deliverable": "HTML Deliverable — scroll, slide, or tabbed; all HTML formats",
        "word-document":    "Word Document (.docx)",
        "html-email":       "HTML Email",
      };

      const lines: string[] = [];

      lines.push(`# ${t.title} — Production Instructions`);
      lines.push(`**Format:** ${formatLabels[t.formatType] ?? t.formatType}`);
      if (t.practiceAreas?.length) lines.push(`**Practice areas:** ${t.practiceAreas.map((p: { name: string }) => p.name).join(", ")}`);
      if (t.relatedMethodologies?.length) lines.push(`**Related methodologies:** ${t.relatedMethodologies.map((m: { name: string }) => m.name).join(", ")}`);
      if (t.previewUrl)   lines.push(`**Preview:** ${t.previewUrl}`);
      if (t.githubRawUrl) lines.push(`**Source HTML:** ${t.githubRawUrl}`);
      if (t.dropboxLink)  lines.push(`**Source file:** ${t.dropboxLink}`);

      const navLabel: Record<string, string> = { smart: "Smart nav (include if >8 sections)", always: "Always include navigation", none: "No navigation" };
      const coverLabel: Record<string, string> = { "internal": "Internal — no confidentiality line", "external-jda": "External — JDA authored", "external-client": "External — client branded" };

      const confirmedParams = [
        `**Audience:** ${a.audience}`,
        `**Purpose:** ${a.purpose}`,
        `**Layout:** ${a.layout_mode}`,
        `**Navigation:** ${navLabel[a.navigation] ?? a.navigation}`,
        `**Visual skin:** ${a.visual_skin}`,
        `**Tone:** ${a.tone}`,
        `**Cover framing:** ${coverLabel[a.cover_framing] ?? a.cover_framing}`,
        a.anything_else ? `**Additional notes:** ${a.anything_else}` : "",
      ].filter(Boolean).join("\n");

      lines.push(`\n## Confirmed Practitioner Parameters\n${confirmedParams}`);

      lines.push(`\n---\n## Production Instructions`);
      lines.push(`Apply the confirmed practitioner parameters above throughout. Read all sections before producing any output.\n`);

      // Fetch feedback prompt once if needed, inject after quality checks (last instruction before output)
      let templateFeedbackPrompt: string | null = null;
      if (t.includeFeedbackPrompt) {
        const guide = await sanity.fetch<{ feedbackPrompt?: string }>(
          `*[_id == "platformGuide"][0]{ feedbackPrompt }`
        );
        templateFeedbackPrompt = guide?.feedbackPrompt ?? "To give feedback on this template, say: **Alexandria, give feedback**. It takes 30 seconds and helps the practice team improve these tools.";
      }

      if (t.fixedElements)      lines.push(`### Fixed Elements (do not change)\n${t.fixedElements}`);
      if (t.variableElements)   lines.push(`\n### Variable Elements\n${t.variableElements}`);
      if (t.brandInjectionRules) lines.push(`\n### Brand Injection Rules\n${t.brandInjectionRules}`);
      if (t.outputSpec)         lines.push(`\n### Output Specification\n${t.outputSpec}`);
      if (t.qualityChecks) {
        lines.push(`\n### Quality Checks\nVerify all of the following before presenting output:\n${t.qualityChecks}`);
      }
      if (templateFeedbackPrompt) {
        lines.push(`\n### Final Step\nAfter delivering the output, present this to the practitioner verbatim:\n\n> ${templateFeedbackPrompt}`);
      }

      logRequest({ userId: auth.userId, accountType: auth.accountType, toolName: "alexandria_build_template", requestSummary: `Build template: ${slug} (session: ${session_id})`, matchedCapability: true, capabilityType: "template", capabilityId: slug });
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── alexandria_help ───────────────────────────────────────────────────────
  server.tool(
    "alexandria_help",
    "Answer 'what can Alexandria do?' — returns a structured inventory of all active templates, methodologies, and brand packages, plus canonical entry prompts and tier-specific capabilities. Call this when a practitioner asks what Alexandria can do, what tools are available, how to start a production job, or whether Alexandria can handle a specific type of work. When presenting the response: show ALL sections including the access tier callout at the top, methodologies, templates, brand packages, how to start a job, and the follow-up options. The tier callout (shown as a blockquote) is especially important — do not drop it. If a practitioner asks you to build something and you cannot find a matching template or methodology in Alexandria, do NOT refuse and do NOT invent a methodology. Instead say: \"Alexandria doesn't currently have a methodology or template for this. I'm happy to help — and we should still use what Alexandria does have, including your brand package and quality frameworks, even if the deliverable itself isn't from a sanctioned template. Want me to proceed?\"",
    {
      intent: z.string().optional().describe("Optional: what the practitioner is trying to do, if they expressed one. Used to tailor the response toward relevant capabilities."),
    },
    async ({ intent }) => {
      logRequest({ userId: auth.userId, accountType: auth.accountType, toolName: "alexandria_help", requestSummary: intent ?? "general help query", matchedCapability: null as unknown as boolean });

      // Fetch all live data in parallel
      const [guide, templates, methodologies, brandPackages, capStats] = await Promise.all([
        sanity.fetch<{
          platformIntro?: string;
          canonicalEntryPrompts?: Array<{ label: string; prompt: string }>;
          examplePrompts?: Array<{ useCase: string; prompt: string }>;
        }>(`*[_id == "platformGuide"][0]{platformIntro, canonicalEntryPrompts, examplePrompts}`),
        sanity.fetch<Array<{ title: string; slug: { current: string }; formatType?: string; useCases?: string }>>(
          `*[_type == "template" && status != "archived"] | order(title asc) { title, slug, formatType, useCases }`
        ),
        sanity.fetch<Array<{ name: string; slug: { current: string }; description?: string; practice?: { name: string }; aiClassification?: string }>>(
          `*[_type == "productionMethodology" && provenStatus != "archived"] | order(name asc) { name, slug, description, practice->{name}, aiClassification }`
        ),
        sanity.fetch<Array<{ clientName: string; slug: { current: string } }>>(
          `*[_type == "clientBrandPackage" && status != "archived"] | order(clientName asc) { clientName, slug }`
        ),
        sanity.fetch<{ total: number; methodology_built: number; proven_status: number }>(
          `{
            "total": count(*[_type == "capabilityRecord"]),
            "methodology_built": count(*[_type == "capabilityRecord" && status == "methodology_built"]),
            "proven_status": count(*[_type == "capabilityRecord" && status == "proven_status"])
          }`
        ),
      ]);

      const lines: string[] = [];

      // ── Elevated access callout — MUST appear first, before all other content ─
      const [canSaveBrand, canUpdateCapability] = await Promise.all([
        checkPermission("mcp_tool:alexandria_save_brand_package"),
        checkPermission("mcp_tool:alexandria_update_capability"),
      ]);
      const hasElevatedAccess = canSaveBrand.allowed || canUpdateCapability.allowed;
      if (hasElevatedAccess) {
        const elevatedTools = [
          canSaveBrand.allowed ? "`alexandria_save_brand_package`" : "",
          canUpdateCapability.allowed ? "`alexandria_update_capability`" : "",
        ].filter(Boolean).join(", ");
        lines.push(`**[ADMIN ACCESS]** You are connected at the elevated admin tier. Write tools available: ${elevatedTools}. You have full visibility into all methodology fields including system instructions, vision of good, tips, and check prompts.`);
        lines.push(``);
      }

      // ── Header ────────────────────────────────────────────────────────────
      lines.push(`# Alexandria — Platform Inventory`);
      lines.push(`\n${guide?.platformIntro ?? "Alexandria is JDA's production intelligence layer — approved templates, methodologies, and brand packages, centrally maintained."}\n`);

      // ── Methodologies ────────────────────────────────────────────────────
      lines.push(`---\n## Methodologies`);
      if (methodologies.length === 0) {
        lines.push(`_No active methodologies yet._`);
      } else {
        const byPractice: Record<string, typeof methodologies> = {};
        for (const m of methodologies) {
          const area = m.practice?.name ?? "General";
          if (!byPractice[area]) byPractice[area] = [];
          byPractice[area].push(m);
        }
        for (const [area, items] of Object.entries(byPractice)) {
          lines.push(`\n**${area}**`);
          for (const m of items) {
            lines.push(`- **${m.name}** — ${m.description ?? ""}`);
          }
        }
      }

      // ── Templates ────────────────────────────────────────────────────────
      lines.push(`\n---\n## Templates`);
      if (templates.length === 0) {
        lines.push(`_No active templates yet._`);
      } else {
        const byFormat: Record<string, typeof templates> = {};
        for (const t of templates) {
          const fmt = t.formatType ?? "Other";
          if (!byFormat[fmt]) byFormat[fmt] = [];
          byFormat[fmt].push(t);
        }
        for (const [fmt, items] of Object.entries(byFormat)) {
          lines.push(`\n**${fmt}**`);
          for (const t of items) {
            lines.push(`- **${t.title}** — ${t.useCases ?? ""}`);
          }
        }
      }

      // ── Brand Packages ────────────────────────────────────────────────────
      lines.push(`\n---\n## Brand Packages (${brandPackages.length} clients)`);
      if (brandPackages.length === 0) {
        lines.push(`_No brand packages loaded yet._`);
      } else {
        lines.push(brandPackages.map((b) => b.clientName).join(", "));
      }

      // ── Capabilities Matrix ───────────────────────────────────────────────
      lines.push(`\n---\n## Capabilities Matrix`);
      lines.push(`${capStats?.total ?? 0} deliverable types tracked across all JDA practice areas — ${capStats?.methodology_built ?? 0} with methodologies built, ${capStats?.proven_status ?? 0} at Proven Status.`);
      lines.push(`\nUse \`alexandria_list_capabilities\` to browse the full matrix by practice area, AI classification, or status.`);
      lines.push(`Use \`alexandria_get_capability\` to get the AI assessment for a specific deliverable type.`);
      lines.push(`If a practitioner asks about AI capability for a deliverable type and you can't find it, use \`alexandria_log_capability_gap\` to flag it for the next Discovery Intensive.`);

      // ── Full tool inventory ───────────────────────────────────────────────
      lines.push(`\n---\n## Available Tools`);
      lines.push(`\n**Production — Templates**`);
      lines.push(`- \`alexandria_list_templates\` — list active deliverable templates`);
      lines.push(`- \`alexandria_get_template\` — start intake for a specific template (returns session_id + questions)`);
      lines.push(`- \`alexandria_submit_intake\` — submit practitioner answers to complete intake`);
      lines.push(`- \`alexandria_build_template\` — get production instructions after intake is complete`);
      lines.push(`\n**Production — Methodologies**`);
      lines.push(`- \`alexandria_list_methodologies\` — list active production methodologies`);
      lines.push(`- \`alexandria_get_methodology\` — get full methodology instructions`);
      lines.push(`\n**Brand Packages**`);
      lines.push(`- \`alexandria_list_brand_packages\` — list all loaded client brand packages`);
      lines.push(`- \`alexandria_get_brand_package\` — load colors, fonts, logos, voice for a specific client`);
      if (canSaveBrand.allowed) {
        lines.push(`- \`alexandria_save_brand_package\` *(elevated)* — save or update a brand package`);
      }
      lines.push(`\n**Capabilities Matrix**`);
      lines.push(`- \`alexandria_list_capabilities\` — browse deliverable types by practice area, classification, or status`);
      lines.push(`- \`alexandria_get_capability\` — get the AI assessment for a specific deliverable type`);
      lines.push(`- \`alexandria_log_capability_gap\` — flag an unrecognized deliverable type for the backlog`);
      if (canUpdateCapability.allowed) {
        lines.push(`- \`alexandria_update_capability\` *(elevated)* — update classification and capability assessment`);
      }
      lines.push(`\n**Discovery**`);
      lines.push(`- \`alexandria_list_practice_areas\` — list JDA practice areas`);
      lines.push(`- \`alexandria_list_deliverables\` — list deliverable classifications`);
      lines.push(`- \`alexandria_whoami\` — check your connected identity and permission tier`);

      // ── How to start ──────────────────────────────────────────────────────
      lines.push(`\n---\n## How to Start a Job`);
      lines.push(`Use a short entry prompt — no client, no content in the opening line. Examples:\n`);
      if (guide?.canonicalEntryPrompts?.length) {
        for (const ep of guide.canonicalEntryPrompts) {
          lines.push(`- "${ep.prompt}"`);
        }
      } else {
        lines.push(`- "I need to build an HTML deliverable from Alexandria."`);
        lines.push(`- "I need to run the Post-Discovery Brief methodology from Alexandria."`);
      }

      // ── What next? ────────────────────────────────────────────────────────
      lines.push(`\n---\n## What do you want to do?`);
      lines.push(`Reply with one of these or describe what you need:`);
      lines.push(`- **Build a deliverable** — HTML, slideshow, or Word doc`);
      lines.push(`- **Run a methodology** — post-discovery brief, pre-discovery brief, brand extraction`);
      lines.push(`- **Load a brand package** — pull colors, fonts, logos for a specific client`);
      lines.push(`- **Check AI capability** — ask what AI can do for a specific deliverable type`);
      lines.push(`- **Something else** — describe it and Alexandria will tell you if it has it`);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── alexandria_list_capabilities ──────────────────────────────────────────
  server.tool(
    "alexandria_list_capabilities",
    "List JDA's Capability Records — the full map of deliverable types, their AI classification (AI-Led, AI-Assisted, Human-Led), and transformation status. Use this when a practitioner asks what AI can do for a given type of work, what JDA produces, or how far along the AI transformation is. Optionally filter by practice area, classification, or status.",
    {
      practice_area: z.string().optional().describe("Filter by practice area (e.g. 'Brand Strategy', 'PR', 'Copy and Content')"),
      classification: z.enum(["ai_led", "ai_assisted", "human_led"]).optional().describe("Filter by AI classification"),
      status: z.enum(["not_evaluated", "classified", "methodology_built", "proven_status"]).optional().describe("Filter by transformation status"),
    },
    async ({ practice_area, classification, status }) => {
      // Apply practice scoping if user's capability_record:read scope is own_practice
      const capPerm = await checkPermission("capability_record:read");
      const effectivePracticeArea = practice_area
        ?? (capPerm.scope === "own_practice" && auth.practice ? auth.practice : undefined);

      let filter = `_type == "capabilityRecord"`;
      if (effectivePracticeArea) filter += ` && practiceArea == "${effectivePracticeArea}"`;
      if (classification) filter += ` && aiClassification == "${classification}"`;
      if (status) filter += ` && status == "${status}"`;

      const records = await sanity.fetch<Array<{
        deliverableName: string;
        slug: { current: string };
        practiceArea: string;
        status: string;
        aiClassification?: string;
        linkedMethodology?: { name: string; slug: { current: string } };
      }>>(
        `*[${filter}] | order(practiceArea asc, deliverableName asc) {
          deliverableName, slug, practiceArea, status, aiClassification,
          "linkedMethodology": linkedMethodology->{ name, "slug": slug.current }
        }`
      );

      logRequest({ userId: auth.userId, accountType: auth.accountType, toolName: "alexandria_list_capabilities", requestSummary: `list capabilities (practice: ${practice_area ?? "all"}, class: ${classification ?? "all"}, status: ${status ?? "all"})`, matchedCapability: records.length > 0 });

      const statusLabel: Record<string, string> = {
        not_evaluated: "Not Evaluated",
        classified: "Classified",
        methodology_built: "Methodology Built",
        proven_status: "✓ Proven Status",
      };
      const classLabel: Record<string, string> = {
        ai_led: "AI-Led",
        ai_assisted: "AI-Assisted",
        human_led: "Human-Led",
      };

      const lines: string[] = [`# Capabilities (${records.length} records)\n`];

      // Group by practice area
      const byPractice: Record<string, typeof records> = {};
      for (const r of records) {
        if (!byPractice[r.practiceArea]) byPractice[r.practiceArea] = [];
        byPractice[r.practiceArea].push(r);
      }

      for (const [area, items] of Object.entries(byPractice)) {
        lines.push(`## ${area}`);
        for (const r of items) {
          const cls = r.aiClassification ? ` · ${classLabel[r.aiClassification]}` : " · Not Classified";
          const st = statusLabel[r.status] ?? r.status;
          const meth = r.linkedMethodology ? ` → ${r.linkedMethodology.name}` : "";
          lines.push(`- **${r.deliverableName}** — ${st}${cls}${meth}`);
        }
        lines.push("");
      }

      // Summary counts
      const counts: Record<string, number> = { not_evaluated: 0, classified: 0, methodology_built: 0, proven_status: 0 };
      for (const r of records) counts[r.status] = (counts[r.status] ?? 0) + 1;
      lines.push(`---\n**Summary:** ${records.length} total · ${counts.not_evaluated} not evaluated · ${counts.classified} classified · ${counts.methodology_built} methodology built · ${counts.proven_status} proven`);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── alexandria_get_capability ─────────────────────────────────────────────
  server.tool(
    "alexandria_get_capability",
    "Get the full capability assessment for a specific deliverable type. Returns AI classification, current AI ceiling, support role, and links to the associated methodology. For AI-Led deliverables, directs the practitioner to the production methodology. For Human-Led deliverables, returns an honest assessment with a live search supplement if enabled. Use this when a practitioner asks what AI can do for a specific deliverable type.",
    {
      slug: z.string().describe("Deliverable slug (e.g. 'press-release', 'brand-positioning-and-concept-development'). Use alexandria_list_capabilities to find available slugs."),
    },
    async ({ slug }) => {
      const normalizedSlug = slug.trim().toLowerCase().replace(/[\s_]+/g, "-");
      const lowerName = slug.trim().toLowerCase();

      const r = await sanity.fetch<{
        deliverableName: string;
        slug: { current: string };
        practiceArea: string;
        status: string;
        aiClassification?: string;
        currentAiCeiling?: string;
        aiSupportRole?: string;
        recommendedToolStack?: string[];
        ceilingLastReviewed?: string;
        liveSearchEnabled?: boolean;
        baselineProductionTime?: string;
        aiNativeProductionTime?: string;
        linkedMethodology?: { name: string; slug: string };
        notes?: string;
      } | null>(
        `*[_type == "capabilityRecord" && (
          slug.current == $slug ||
          slug.current == $normalizedSlug ||
          lower(deliverableName) == $lowerName ||
          lower(deliverableName) match $namePattern
        )][0] {
          deliverableName, slug, practiceArea, status, aiClassification,
          currentAiCeiling, aiSupportRole, recommendedToolStack,
          ceilingLastReviewed, liveSearchEnabled,
          baselineProductionTime, aiNativeProductionTime,
          "linkedMethodology": linkedMethodology->{ name, "slug": slug.current },
          notes
        }`,
        { slug, normalizedSlug, lowerName, namePattern: `*${lowerName}*` }
      );

      if (!r) {
        logRequest({ userId: auth.userId, accountType: auth.accountType, toolName: "alexandria_get_capability", requestSummary: `Get capability: ${slug}`, matchedCapability: false });
        return {
          content: [{ type: "text", text: `No capability record found for: ${slug}. Use alexandria_list_capabilities to browse available records, or alexandria_log_capability_gap to flag this as a missing capability.` }],
          isError: true,
        };
      }

      logRequest({ userId: auth.userId, accountType: auth.accountType, toolName: "alexandria_get_capability", requestSummary: `Get capability: ${r.deliverableName}`, matchedCapability: true, capabilityType: "capability_record", capabilityId: r.slug.current });

      const classLabel: Record<string, string> = {
        ai_led: "AI-Led",
        ai_assisted: "AI-Assisted",
        human_led: "Human-Led",
      };
      const statusLabel: Record<string, string> = {
        not_evaluated: "Not Evaluated",
        classified: "Classified",
        methodology_built: "Methodology Built",
        proven_status: "Proven Status ✓",
      };

      const lines: string[] = [`# ${r.deliverableName}`];
      lines.push(`**Practice:** ${r.practiceArea} · **Status:** ${statusLabel[r.status] ?? r.status}`);
      if (r.aiClassification) lines.push(`**AI Classification:** ${classLabel[r.aiClassification]}`);

      if (r.aiClassification === "ai_led") {
        lines.push(`\nThis is an **AI-Led** deliverable. Alexandria has a full production methodology for this.`);
        if (r.linkedMethodology) {
          lines.push(`\n**Production methodology:** ${r.linkedMethodology.name}`);
          lines.push(`To build this, start with: *"I need to run the ${r.linkedMethodology.name} methodology from Alexandria."*`);
        } else {
          lines.push(`\nNo methodology is linked yet. A Discovery Intensive is needed before production begins.`);
        }
      } else if (r.aiClassification === "ai_assisted") {
        lines.push(`\nThis is an **AI-Assisted** deliverable. A human leads this work; AI accelerates specific stages.`);
        if (r.aiSupportRole) lines.push(`\n**Where AI helps:** ${r.aiSupportRole}`);
        if (r.currentAiCeiling) lines.push(`\n**Current AI ceiling:** ${r.currentAiCeiling}`);
        if (r.recommendedToolStack?.length) lines.push(`\n**Recommended tools:** ${r.recommendedToolStack.join(", ")}`);
        if (r.linkedMethodology) lines.push(`\n**Support methodology:** ${r.linkedMethodology.name} (${r.linkedMethodology.slug})`);
      } else if (r.aiClassification === "human_led") {
        lines.push(`\nThis is a **Human-Led** deliverable. Human judgment is primary; AI supports upstream stages only.`);
        if (r.currentAiCeiling) {
          const reviewNote = r.ceilingLastReviewed
            ? ` *(Assessment last reviewed: ${new Date(r.ceilingLastReviewed).toLocaleDateString()})*`
            : " *(Assessment date unknown — may be stale)*";
          lines.push(`\n**Current AI ceiling:**${reviewNote}\n${r.currentAiCeiling}`);
        }
        if (r.aiSupportRole) lines.push(`\n**Where AI can help:** ${r.aiSupportRole}`);
        if (r.recommendedToolStack?.length) lines.push(`\n**Recommended tools:** ${r.recommendedToolStack.join(", ")}`);
        if (r.liveSearchEnabled) {
          lines.push(`\n*Performing a live search to supplement this assessment with current tool capabilities...*`);
          lines.push(`[Search: "current AI tools for ${r.deliverableName.toLowerCase()} 2026"]`);
        }
      } else {
        lines.push(`\nThis deliverable type has not yet been evaluated through a Discovery Intensive. No AI classification exists yet.`);
        if (r.notes) lines.push(`\n**Notes:** ${r.notes}`);
      }

      if (r.baselineProductionTime || r.aiNativeProductionTime) {
        lines.push(`\n---\n**Production Time**`);
        if (r.baselineProductionTime) lines.push(`Legacy: ${r.baselineProductionTime}`);
        if (r.aiNativeProductionTime) lines.push(`AI-native: ${r.aiNativeProductionTime}`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── alexandria_log_capability_gap ─────────────────────────────────────────
  server.tool(
    "alexandria_log_capability_gap",
    "Log a practitioner request for a deliverable type that doesn't have a Capability Record in Alexandria yet. Creates a not_evaluated stub record so it appears in the backlog for the next Discovery Intensive. Call this when a practitioner asks about AI capability for a deliverable type you cannot find in alexandria_list_capabilities.",
    {
      deliverable_name: z.string().describe("The name of the deliverable type the practitioner is asking about."),
      practice_area: z.string().optional().describe("Practice area if known."),
      context: z.string().optional().describe("Brief context — what the practitioner was trying to do."),
    },
    async ({ deliverable_name, practice_area, context }) => {
      const slug = deliverable_name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

      // Check if already exists
      const existing = await sanity.fetch<{ _id: string } | null>(
        `*[_type == "capabilityRecord" && slug.current == $slug][0]{ _id }`,
        { slug }
      );

      if (existing) {
        return { content: [{ type: "text", text: `A capability record for "${deliverable_name}" already exists (slug: ${slug}). Use alexandria_get_capability to retrieve it.` }] };
      }

      const doc = {
        _type: "capabilityRecord",
        deliverableName: deliverable_name,
        slug: { _type: "slug", current: slug },
        practiceArea: practice_area ?? "Unassigned",
        status: "not_evaluated",
        source: "capability_gap_log",
        notes: context ? `Gap logged from practitioner request: ${context}` : "Gap logged from practitioner request.",
      };

      await sanity.create(doc);

      logRequest({ userId: auth.userId, accountType: auth.accountType, toolName: "alexandria_log_capability_gap", requestSummary: `Gap logged: ${deliverable_name}`, matchedCapability: false });

      return {
        content: [{ type: "text", text: `Logged "${deliverable_name}" as a capability gap. It has been added to the backlog as a not_evaluated record and will be reviewed in the next Discovery Intensive. Alexandria doesn't currently have AI capability guidance for this deliverable type — I'm happy to help using general best practices. Want me to proceed?` }],
      };
    }
  );

  // ── alexandria_update_capability ──────────────────────────────────────────
  server.tool(
    "alexandria_update_capability",
    "Update the capability assessment fields on a Capability Record. Practice Leader and Admin tier only. Use this to update AI ceiling assessments, support role descriptions, recommended tool stacks, and review timestamps after a Discovery Intensive or when AI capabilities have changed.",
    {
      slug: z.string().describe("Slug of the capability record to update."),
      ai_classification: z.enum(["ai_led", "ai_assisted", "human_led"]).optional(),
      status: z.enum(["not_evaluated", "classified", "methodology_built", "proven_status"]).optional(),
      current_ai_ceiling: z.string().optional(),
      ai_support_role: z.string().optional(),
      recommended_tool_stack: z.array(z.string()).optional(),
      live_search_enabled: z.boolean().optional(),
      baseline_production_time: z.string().optional(),
      ai_native_production_time: z.string().optional(),
      notes: z.string().optional(),
    },
    async ({ slug, ai_classification, status, current_ai_ceiling, ai_support_role, recommended_tool_stack, live_search_enabled, baseline_production_time, ai_native_production_time, notes }) => {
      const perm = await checkPermission("mcp_tool:alexandria_update_capability");
      if (!perm.allowed) {
        return { content: [{ type: "text", text: "Permission denied. Updating capability records requires practice_leader or admin role. Contact your administrator to request access." }], isError: true };
      }

      const normalizedSlug = slug.trim().toLowerCase().replace(/[\s_]+/g, "-");
      const existing = await sanity.fetch<{ _id: string } | null>(
        `*[_type == "capabilityRecord" && slug.current == $slug][0]{ _id }`,
        { slug: normalizedSlug }
      );

      if (!existing) {
        return { content: [{ type: "text", text: `No capability record found for slug: ${slug}` }], isError: true };
      }

      const patch: Record<string, unknown> = {};
      if (ai_classification !== undefined) patch.aiClassification = ai_classification;
      if (status !== undefined) patch.status = status;
      if (current_ai_ceiling !== undefined) patch.currentAiCeiling = current_ai_ceiling;
      if (ai_support_role !== undefined) patch.aiSupportRole = ai_support_role;
      if (recommended_tool_stack !== undefined) patch.recommendedToolStack = recommended_tool_stack;
      if (live_search_enabled !== undefined) patch.liveSearchEnabled = live_search_enabled;
      if (baseline_production_time !== undefined) patch.baselineProductionTime = baseline_production_time;
      if (ai_native_production_time !== undefined) patch.aiNativeProductionTime = ai_native_production_time;
      if (notes !== undefined) patch.notes = notes;
      if (status === "proven_status") patch.provenStatusAchievedAt = new Date().toISOString();
      if (current_ai_ceiling !== undefined) patch.ceilingLastReviewed = new Date().toISOString();

      await sanity.patch(existing._id).set(patch).commit();

      logRequest({ userId: auth.userId, accountType: auth.accountType, toolName: "alexandria_update_capability", requestSummary: `Updated capability: ${slug}`, matchedCapability: true, capabilityType: "capability_record", capabilityId: normalizedSlug });

      return { content: [{ type: "text", text: `Capability record updated: ${slug}\n\nFields updated: ${Object.keys(patch).join(", ")}` }] };
    }
  );

  // ── alexandria_save_brand_package ────────────────────────────────────────
  server.tool(
    "alexandria_save_brand_package",
    "Save or update a client brand package in Alexandria. Use this after completing a brand package extraction to make the package available to all practitioners. Requires practice_leader or admin tier. If a package already exists for the client slug, it will be updated. If not, a new record is created.",
    {
      client_name:     z.string().describe("Full client name (e.g. 'Heartbeat International')"),
      slug:            z.string().describe("URL-safe identifier (e.g. 'heartbeat-international'). Use hyphens, lowercase, no spaces."),
      content:         z.string().describe("The full extracted brand package in markdown. This is the primary field Alexandria serves to Claude."),
      abbreviations:   z.string().optional().describe("Common short forms (e.g. 'HBI, HI')"),
      source_document: z.string().optional().describe("Original brand guide filename or description (e.g. 'HBI Brand Standards 2024.pdf')"),
      extracted_by:    z.string().optional().describe("Name of the practitioner who ran the extraction"),
      dropbox_link:    z.string().optional().describe("Link to the source PDF in Dropbox"),
      notes:           z.string().optional().describe("Extraction notes, stale data warnings, gaps, or caveats"),
    },
    async ({ client_name, slug, content, abbreviations, source_document, extracted_by, dropbox_link, notes }) => {
      const perm = await checkPermission("mcp_tool:alexandria_save_brand_package");
      if (!perm.allowed) {
        return { content: [{ type: "text", text: "Permission denied. Saving brand packages requires practice_leader or admin role. Contact your administrator to request access." }], isError: true };
      }

      // Normalize slug — lowercase, hyphens only
      const normalizedSlug = slug.trim().toLowerCase().replace(/[\s_]+/g, "-");

      // Check if a record already exists for this slug
      const existing = await sanity.fetch<{ _id: string } | null>(
        `*[_type == "clientBrandPackage" && slug.current == $slug][0]{ _id }`,
        { slug: normalizedSlug }
      );

      const today = new Date().toISOString().split("T")[0];

      if (existing) {
        // Update existing record
        await sanity
          .patch(existing._id)
          .set({
            clientName:     client_name,
            abbreviations:  abbreviations ?? "",
            sourceDocument: source_document ?? "",
            extractedBy:    extracted_by ?? "",
            extractedDate:  today,
            rawMarkdown:    content,
            gaps:           notes ?? "",
          })
          .commit();

        return {
          content: [{
            type: "text",
            text: `Brand package for "${client_name}" updated in Alexandria.\nSlug: ${normalizedSlug}\nExtracted: ${today}\n\nThe package is now live. All practitioners will use the updated brand system for ${client_name} on their next methodology run.`,
          }],
        };
      } else {
        // Create new record
        await sanity.create({
          _type:          "clientBrandPackage",
          clientName:     client_name,
          slug:           { _type: "slug", current: normalizedSlug },
          abbreviations:  abbreviations ?? "",
          sourceDocument: source_document ?? "",
          extractedBy:    extracted_by ?? "",
          extractedDate:  today,
          rawMarkdown:    content,
          gaps:           notes ?? "",
        });

        return {
          content: [{
            type: "text",
            text: `Brand package for "${client_name}" saved to Alexandria.\nSlug: ${normalizedSlug}\nExtracted: ${today}\n\nThe package is now live. All practitioners will automatically use the ${client_name} brand system in future methodology runs.`,
          }],
        };
      }
    }
  );

  // ── alexandria_whoami ─────────────────────────────────────────────────────
  server.tool(
    "alexandria_whoami",
    "Returns your current identity, account type, assigned roles, and effective permissions in Alexandria.",
    {},
    async () => {
      const [user] = await sql`SELECT name, email, account_type, practice FROM users WHERE id = ${auth.userId}`;
      if (!user) return { content: [{ type: "text", text: "User not found." }], isError: true };

      const lines: string[] = [];
      lines.push(`Name: ${user.name ?? "—"}`);
      lines.push(`Email: ${user.email ?? "—"}`);
      lines.push(`Account type: ${user.account_type}`);
      lines.push(`Practice: ${user.practice ?? "All"}`);

      if (auth.debugRoleId) {
        const [debugRole] = await sql`SELECT display_name FROM roles WHERE id = ${auth.debugRoleId}`;
        lines.push(`\n⚠️  DEBUG MODE ACTIVE — impersonating role: ${debugRole?.display_name ?? auth.debugRoleId}`);
        lines.push(`   Owner bypass is suspended. Permissions reflect the debug role only.`);
        lines.push(`   Use \`alexandria_debug_exit\` to return to full owner access.`);

        const debugPerms = await sql`
          SELECT action, scope FROM role_permissions WHERE role_id = ${auth.debugRoleId} ORDER BY action
        `;
        if (debugPerms.length > 0) {
          lines.push("\nDebug role permissions:");
          for (const p of debugPerms as unknown as Array<{ action: string; scope: string }>) {
            lines.push(`  ${p.action} [${p.scope}]`);
          }
        } else {
          lines.push("\nDebug role has no permissions.");
        }
      } else {
        const roles = await sql`
          SELECT r.id, r.display_name, r.slug
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = ${auth.userId}
          ORDER BY r.display_name
        `;

        const rolePermissions = await sql`
          SELECT rp.action, rp.scope, r.display_name AS role_name
          FROM user_roles ur
          JOIN role_permissions rp ON rp.role_id = ur.role_id
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = ${auth.userId}
          ORDER BY rp.action
        `;

        const userPerms = await sql`
          SELECT action, type, scope
          FROM user_permissions
          WHERE user_id = ${auth.userId}
          ORDER BY action
        `;

        if (auth.accountType === "owner") {
          lines.push("\nOwner — all permissions granted automatically (no debug mode active).");
        }

        if (roles.length > 0) {
          lines.push(`\nRoles:`);
          for (const r of roles as unknown as Array<{ id: string; display_name: string; slug: string }>) {
            lines.push(`  ${r.display_name} (slug: ${r.slug}, id: ${r.id})`);
          }
        } else {
          lines.push("\nRoles: None assigned");
        }

        if (rolePermissions.length > 0) {
          lines.push("\nRole permissions:");
          for (const p of rolePermissions as unknown as Array<{ action: string; scope: string; role_name: string }>) {
            lines.push(`  ${p.action} [${p.scope}] — via ${p.role_name}`);
          }
        }

        const grants = (userPerms as unknown as Array<{ action: string; type: string; scope: string }>).filter((p) => p.type === "grant");
        const denials = (userPerms as unknown as Array<{ action: string; type: string; scope: string }>).filter((p) => p.type === "deny");

        if (grants.length > 0) {
          lines.push("\nCustom grants:");
          for (const g of grants) lines.push(`  + ${g.action} [${g.scope}]`);
        }
        if (denials.length > 0) {
          lines.push("\nDenials:");
          for (const d of denials) lines.push(`  - ${d.action}`);
        }
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── alexandria_give_feedback ──────────────────────────────────────────────
  // Phase 1: practitioner says "Alexandria, give feedback". Creates a session
  // and returns the five questions verbatim for Claude to present as a poll.
  // Claude MUST present all questions and collect all answers before calling
  // alexandria_log_feedback with the session_id and answers.
  server.tool(
    "alexandria_give_feedback",
    "Call this when the practitioner says 'Alexandria, give feedback' or similar after a methodology or template run. This starts a feedback session and returns the five questions to present. You MUST present ALL five questions to the practitioner as a numbered poll, verbatim as returned, and collect all answers before calling alexandria_log_feedback. Do NOT call alexandria_log_feedback until you have answers to all five questions.",
    {
      content_type: z.enum(["methodology", "template"]).describe("Whether this feedback is for a methodology or a template"),
      content_slug: z.string().describe("The slug of the methodology or template that was just run"),
    },
    async ({ content_type, content_slug }) => {
      const [user] = await sql`SELECT id FROM users WHERE id = ${auth.userId}`;
      if (!user) return { content: [{ type: "text", text: "Could not identify user." }], isError: true };

      const [session] = await sql`
        INSERT INTO feedback_sessions (content_type, content_slug, user_id)
        VALUES (${content_type}, ${content_slug}, ${auth.userId as number})
        RETURNING session_id
      `;

      const questions = [
        `**Q1.** How much editing did this output need before it was client-ready?`,
        `- A) None — it was ready to send after human review`,
        `- B) Light editing (tone, word choice, minor adjustments)`,
        `- C) Moderate editing (restructured sections, rewrote portions)`,
        `- D) Heavy editing (essentially started over)`,
        ``,
        `**Q2.** Where did the methodology fall short? *(select all that apply)*`,
        `- A) It didn't — output was solid`,
        `- B) Content structure or organization`,
        `- C) Strategic depth or accuracy`,
        `- D) Brand voice or tone`,
        `- E) Visual formatting or layout`,
        `- F) Missing context it should have had`,
        ``,
        `**Q3.** Did the intake questions capture what you needed for this deliverable?`,
        `- A) Yes, they covered the right ground`,
        `- B) Mostly, but missed something important`,
        `- C) No, I had to add significant context manually`,
        ``,
        `**Q4.** Would you use this methodology again for the same deliverable type?`,
        `- A) Yes, confidently`,
        `- B) Yes, with minor adjustments`,
        `- C) Only if it's improved`,
        `- D) No, I'd rather build it manually`,
        ``,
        `**Q5.** Anything else we should know? *(optional)*`,
        `- A) No, that's everything`,
        `- B) Other — type your response below`,
      ].join("\n");

      return {
        content: [{
          type: "text",
          text: `Feedback session started for **${content_slug}** (${content_type}).\n\nPresent these five questions to the practitioner verbatim, in order, as a single message. For questions with lettered options, use an interactive poll widget if available — this lets the practitioner answer with a single click. Collect all answers, then call \`alexandria_log_feedback\` with the session_id and answers.\n\n**session_id:** \`${session.session_id}\`\n\n---\n\n${questions}`,
        }],
      };
    }
  );

  // ── alexandria_log_feedback ───────────────────────────────────────────────
  server.tool(
    "alexandria_log_feedback",
    "Phase 2 of giving feedback. Call this ONLY after alexandria_give_feedback has been called and the practitioner has answered all five questions. Requires the session_id returned by alexandria_give_feedback. The server rejects calls without a valid session_id.",
    {
      session_id: z.string().uuid().describe("The session_id returned by alexandria_give_feedback"),
      editing_needed: z.enum(["A", "B", "C", "D"]).describe("Q1 answer — A=None, B=Light, C=Moderate, D=Heavy"),
      shortfalls: z.array(z.enum(["A", "B", "C", "D", "E", "F"])).describe("Q2 answers — select all that apply"),
      intake_adequate: z.enum(["A", "B", "C"]).describe("Q3 answer — A=Yes, B=Mostly, C=No"),
      would_use_again: z.enum(["A", "B", "C", "D"]).describe("Q4 answer — A=Yes confidently, B=Yes with adjustments, C=Only if improved, D=No"),
      observation: z.string().optional().describe("Q5 open text if practitioner selected Other or has additional notes"),
    },
    async ({ session_id, editing_needed, shortfalls, intake_adequate, would_use_again, observation }) => {
      const [session] = await sql`
        SELECT session_id, content_type, content_slug, status, user_id
        FROM feedback_sessions
        WHERE session_id = ${session_id}
      `;

      if (!session) {
        return { content: [{ type: "text", text: `Cannot log feedback: session \`${session_id}\` not found. Call \`alexandria_give_feedback\` first.` }], isError: true };
      }
      if (session.status === "complete") {
        return { content: [{ type: "text", text: `Feedback for session \`${session_id}\` has already been logged.` }], isError: true };
      }

      await sql`
        INSERT INTO production_feedback
          (user_id, content_type, content_slug, editing_needed, shortfalls, intake_adequate, would_use_again, observation)
        VALUES
          (${session.user_id as number}, ${session.content_type}, ${session.content_slug}, ${editing_needed}, ${shortfalls}, ${intake_adequate}, ${would_use_again}, ${observation ?? null})
      `;

      await sql`UPDATE feedback_sessions SET status = 'complete' WHERE session_id = ${session_id}`;

      const editingLabels: Record<string, string> = { A: "None — ready after human review", B: "Light editing", C: "Moderate editing", D: "Heavy editing" };
      const shortfallLabels: Record<string, string> = { A: "Output was solid", B: "Content structure/organization", C: "Strategic depth/accuracy", D: "Brand voice/tone", E: "Visual formatting/layout", F: "Missing context" };
      const intakeLabels: Record<string, string> = { A: "Yes, covered the right ground", B: "Mostly, missed something", C: "No, added significant context manually" };
      const useAgainLabels: Record<string, string> = { A: "Yes, confidently", B: "Yes, with minor adjustments", C: "Only if improved", D: "No, would build manually" };

      const lines = [
        `✓ Feedback logged for **${session.content_slug}** (${session.content_type}).`,
        ``,
        `**Editing needed:** ${editingLabels[editing_needed] ?? editing_needed}`,
        `**Shortfalls:** ${shortfalls.map((s: string) => shortfallLabels[s] ?? s).join(", ")}`,
        `**Intake adequate:** ${intakeLabels[intake_adequate] ?? intake_adequate}`,
        `**Would use again:** ${useAgainLabels[would_use_again] ?? would_use_again}`,
      ];
      if (observation) lines.push(`**Notes:** ${observation}`);
      lines.push(``, `This feedback is now visible to practice leaders and admins in the Alexandria portal.`);

      logRequest({ userId: auth.userId, accountType: auth.accountType, toolName: "alexandria_log_feedback", requestSummary: `Feedback for ${session.content_type} ${session.content_slug}`, matchedCapability: true });
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── alexandria_debug_as_role ───────────────────────────────────────────────
  // Owner-only. Sets a debug role on the current OAuth session. While active,
  // checkPermission resolves as if the owner were a member of only that role.
  // Cleared automatically on next login. Use alexandria_debug_exit to clear now.
  server.tool(
    "alexandria_debug_as_role",
    "Owner only. Enter debug mode by impersonating a specific role. While active, your permissions in Alexandria will be evaluated as if you only had the permissions of that role — your owner bypass is suspended. This resets automatically when you log in again. Use alexandria_debug_exit to exit immediately.",
    {
      role: z.string().describe("Role to impersonate — accepts the role slug (e.g. 'editor', 'practitioner') or UUID"),
    },
    async ({ role: roleInput }) => {
      if (auth.accountType !== "owner") {
        return { content: [{ type: "text", text: "Access denied. Debug mode is only available to owners." }], isError: true };
      }

      // Accept slug or UUID — try UUID match first, fall back to slug
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const [role] = uuidPattern.test(roleInput)
        ? await sql`SELECT id, display_name FROM roles WHERE id = ${roleInput}`
        : await sql`SELECT id, display_name FROM roles WHERE slug = ${roleInput}`;

      if (!role) {
        const available = await sql`SELECT slug, display_name FROM roles ORDER BY display_name`;
        const list = (available as unknown as Array<{ slug: string; display_name: string }>)
          .map(r => `  ${r.slug} — ${r.display_name}`).join("\n");
        return { content: [{ type: "text", text: `Role not found: "${roleInput}"\n\nAvailable roles:\n${list}` }], isError: true };
      }

      const role_id = role.id as string;

      // Update ALL active sessions for this user so portal and Claude stay in sync
      // regardless of whether this request came in via OAuth session or API key.
      await sql`
        UPDATE oauth_sessions SET debug_role_id = ${role_id}
        WHERE user_id = ${auth.userId} AND expires_at > NOW()
      `;

      const perms = await sql`SELECT action, scope FROM role_permissions WHERE role_id = ${role_id} ORDER BY action`;
      const permLines = (perms as unknown as Array<{ action: string; scope: string }>)
        .map(p => `  ${p.action} [${p.scope}]`);

      const lines = [
        `✓ Debug mode active — now impersonating: ${role.display_name as string}`,
        ``,
        `Your owner bypass is suspended for this session. Permissions are now:`,
        ...(permLines.length > 0 ? permLines : ["  (no permissions — this role has none)"]),
        ``,
        `Run \`alexandria_whoami\` to confirm. Use \`alexandria_debug_exit\` to return to full owner access.`,
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── alexandria_debug_exit ──────────────────────────────────────────────────
  server.tool(
    "alexandria_debug_exit",
    "Owner only. Exit debug mode and restore full owner permissions immediately.",
    {},
    async () => {
      if (auth.accountType !== "owner") {
        return { content: [{ type: "text", text: "Access denied." }], isError: true };
      }

      // Clear debug_role_id on ALL active sessions for this user — not just the
      // current request's session. This handles the case where debug was activated
      // via OAuth but the current request is coming in via API key (or vice versa).
      const result = await sql`
        UPDATE oauth_sessions SET debug_role_id = NULL
        WHERE user_id = ${auth.userId} AND expires_at > NOW() AND debug_role_id IS NOT NULL
      `;

      if (result.count === 0) {
        return { content: [{ type: "text", text: "Debug mode is not currently active." }] };
      }

      return { content: [{ type: "text", text: "✓ Debug mode cleared. You now have full owner permissions." }] };
    }
  );

  return server;
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const urlObj = new URL(req.url!, `http://localhost`);
  const pathname = urlObj.pathname;

  // ── Health check ───────────────────────────────────────────────────────────
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "alexandria-mcp", version: "0.2.0" }));
    return;
  }

  // ── OAuth discovery metadata (Claude reads this to find token endpoint) ────
  if (pathname === "/.well-known/oauth-authorization-server") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      issuer: MCP_BASE_URL,
      authorization_endpoint: `${MCP_BASE_URL}/authorize`,
      token_endpoint: `${MCP_BASE_URL}/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
    }));
    return;
  }


  // ── OAuth: Step 1 — Claude hits our /authorize ────────────────────────────
  // We store Claude's params, then redirect to Azure AD
  if (pathname === "/oauth/authorize" || pathname === "/authorize") {
    const claudeRedirectUri = urlObj.searchParams.get("redirect_uri") ?? "";
    const claudeState = urlObj.searchParams.get("state") ?? "";
    const codeChallenge = urlObj.searchParams.get("code_challenge") ?? "";
    const codeChallengeMethod = urlObj.searchParams.get("code_challenge_method") ?? "S256";

    // Store Claude's flow params keyed by a short-lived state we send to Azure
    const azureState = randomBytes(16).toString("hex");
    pendingFlows.set(azureState, {
      claudeRedirectUri,
      claudeState,
      codeChallenge,
      codeChallengeMethod,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    const params = new URLSearchParams({
      client_id: AZURE_CLIENT_ID!,
      response_type: "code",
      redirect_uri: `${MCP_BASE_URL}/oauth/callback`,
      scope: "openid profile email User.Read GroupMember.Read.All",
      state: azureState,
      prompt: "select_account",
    });

    const authUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/authorize?${params}`;
    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  // ── OAuth: Step 2 — Azure redirects back to us ────────────────────────────
  // We exchange the Azure code, identify the user, issue our own code to Claude
  if (pathname === "/oauth/callback" || pathname === "/callback") {
    const code = urlObj.searchParams.get("code");
    const azureState = urlObj.searchParams.get("state") ?? "";
    const error = urlObj.searchParams.get("error");

    if (error || !code) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`<h1>Authentication failed</h1><p>${error ?? "No code returned from Azure"}</p>`);
      return;
    }

    const flow = pendingFlows.get(azureState);
    if (!flow || flow.expiresAt < Date.now()) {
      pendingFlows.delete(azureState);
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>Authentication failed</h1><p>OAuth flow expired or not found. Please try again.</p>");
      return;
    }
    pendingFlows.delete(azureState);

    const profile = await exchangeAzureCodeForProfile(code);
    if (!profile) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end("<h1>Authentication failed</h1><p>Could not retrieve user profile from Microsoft.</p>");
      return;
    }

    // Alexandria-Users group is the single authentication gate
    if (!isInAlexandriaUsers(profile.groups)) {
      res.writeHead(403, { "Content-Type": "text/html" });
      res.end(`
        <!DOCTYPE html><html><head><title>Alexandria — Access Denied</title></head>
        <body style="font-family:system-ui;max-width:480px;margin:80px auto;padding:0 24px;text-align:center;">
          <h1 style="font-size:24px;margin-bottom:8px;">Access Denied</h1>
          <p style="color:#666;">Your account is not authorized to use Alexandria. Contact your administrator to request access.</p>
        </body></html>
      `);
      return;
    }

    const userId = await upsertUser(profile.objectId, profile.email, profile.name);

    // Issue our own short-lived auth code to Claude
    const ourCode = randomBytes(32).toString("hex");
    pendingCodes.set(ourCode, {
      userId,
      codeChallenge: flow.codeChallenge,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    // Redirect back to Claude with our code
    const callbackParams = new URLSearchParams({
      code: ourCode,
      state: flow.claudeState,
    });
    res.writeHead(302, { Location: `${flow.claudeRedirectUri}?${callbackParams}` });
    res.end();
    return;
  }

  // ── OAuth: Step 3 — Claude exchanges our code for an access token ─────────
  if (pathname === "/token" || pathname === "/oauth/token") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const params = new URLSearchParams(body);

    const grantType = params.get("grant_type");
    const code = params.get("code");
    const codeVerifier = params.get("code_verifier");

    if (grantType !== "authorization_code" || !code) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_request" }));
      return;
    }

    const pending = pendingCodes.get(code);
    if (!pending || pending.expiresAt < Date.now()) {
      pendingCodes.delete(code);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_grant", error_description: "Code expired or not found" }));
      return;
    }

    // Verify PKCE code_verifier against stored code_challenge
    if (codeVerifier && pending.codeChallenge) {
      const digest = createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");
      if (digest !== pending.codeChallenge) {
        pendingCodes.delete(code);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_grant", error_description: "PKCE verification failed" }));
        return;
      }
    }

    pendingCodes.delete(code);

    const accessToken = await createSessionToken(pending.userId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      access_token: accessToken,
      token_type: "bearer",
      expires_in: 7776000, // 90 days
    }));
    return;
  }

  // ── MCP endpoint ──────────────────────────────────────────────────────────
  if (pathname !== "/mcp") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const auth = await resolveAuth(req);
  if (!auth) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Unauthorized. Use Authorization: Bearer <token> with an OAuth session token or API key.",
      oauth_url: `${MCP_BASE_URL}/oauth/authorize`,
    }));
    return;
  }

  const server = buildServer(auth);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  await transport.handleRequest(req, res);
});

httpServer.listen(PORT, () => {
  console.log(`Alexandria MCP server v0.2.0 running on port ${PORT}`);
});
