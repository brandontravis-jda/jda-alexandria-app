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
// Group membership is the source of truth for permission tiers.
// Checked on every OAuth login — database tier is always overwritten.
const GROUP_ADMINS  = "cba99ef2-0d00-4753-9f3d-89ded870cba1"; // Platform administration
const GROUP_EDITORS = "c85b685b-17e4-4902-ac2a-39e27f585f08"; // Content editors → practice_leader
const GROUP_USERS   = "6864b47f-e09f-4faf-bde2-738c1ac014c4"; // All practitioners

function tierFromGroups(groups: string[]): "admin" | "practice_leader" | "practitioner" | null {
  if (groups.includes(GROUP_ADMINS))  return "admin";
  if (groups.includes(GROUP_EDITORS)) return "practice_leader";
  if (groups.includes(GROUP_USERS))   return "practitioner";
  return null; // Not in any authorized group — reject
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
      id          SERIAL PRIMARY KEY,
      token       TEXT NOT NULL UNIQUE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
      last_used_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS oauth_sessions_token_idx ON oauth_sessions(token)`;
}

migrate().catch((err) => console.error("Migration error:", err));

// ── Sanity ────────────────────────────────────────────────────────────────────

const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: SANITY_API_TOKEN,
  useCdn: false,
});

// ── Auth ──────────────────────────────────────────────────────────────────────

type PermissionTier = "practitioner" | "practice_leader" | "admin";

interface AuthResult {
  userId: number;
  tier: PermissionTier;
  practice: string | null;
}

async function resolveApiKey(apiKey: string): Promise<AuthResult | null> {
  const keyHash = createHash("sha256").update(apiKey).digest("hex");
  const [row] = await sql`
    SELECT k.id AS key_id, u.id AS user_id, u.tier, u.practice
    FROM api_keys k
    JOIN users u ON u.id = k.user_id
    WHERE k.key_hash = ${keyHash}
  `;
  if (!row) return null;

  await sql`UPDATE api_keys SET last_used_at = NOW() WHERE id = ${row.key_id}`;

  return {
    userId: row.user_id as number,
    tier: row.tier as PermissionTier,
    practice: row.practice as string | null,
  };
}

async function resolveOAuthSession(token: string): Promise<AuthResult | null> {
  const [row] = await sql`
    SELECT s.id AS session_id, u.id AS user_id, u.tier, u.practice
    FROM oauth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
  `;
  if (!row) return null;

  await sql`UPDATE oauth_sessions SET last_used_at = NOW() WHERE id = ${row.session_id}`;

  return {
    userId: row.user_id as number,
    tier: row.tier as PermissionTier,
    practice: row.practice as string | null,
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

async function upsertUser(objectId: string, email: string, name: string, tier: string): Promise<number> {
  // Tier is always derived from Azure AD group membership — never from the database.
  const [user] = await sql`
    INSERT INTO users (object_id, email, name, tier, created_at)
    VALUES (${objectId}, ${email}, ${name}, ${tier}, NOW())
    ON CONFLICT (object_id)
    DO UPDATE SET
      email        = EXCLUDED.email,
      name         = EXCLUDED.name,
      tier         = ${tier},
      last_seen_at = NOW()
    RETURNING id
  `;
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

  const isPrivileged = auth.tier === "practice_leader" || auth.tier === "admin";

  // ── alexandria_list_methodologies ─────────────────────────────────────────
  server.tool(
    "alexandria_list_methodologies",
    "List production methodologies from Alexandria. Optionally filter by practice area. Returns name, slug, AI classification, and proven status.",
    {
      practice: z.string().optional().describe("Practice area slug to filter by (e.g. 'brand-strategy', 'content-marketing')"),
    },
    async ({ practice }) => {
      let query: string;
      let params: Record<string, unknown>;

      if (practice) {
        query = `*[_type == "productionMethodology" && practice->slug.current == $practice] | order(name asc) {
          _id, name, "slug": slug.current, aiClassification, provenStatus, version,
          "practice": practice->name
        }`;
        params = { practice };
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
    "Get the production methodology for a specific deliverable type. Returns instructions, steps, quality checks, and required inputs. Use this when a practitioner needs to produce a specific deliverable. The slug parameter accepts the exact slug OR a plain-english name — it will match either. If unsure of the slug, call alexandria_list_methodologies first to see what's available.",
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
        qualityChecks, failureModes, visionOfGood, tips,
        clientRefinements, provenStatus, version, author, validatedBy
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

      // systemInstructions — privileged only
      if (m.systemInstructions) {
        if (isPrivileged) {
          lines.push("\n## System Instructions");
          lines.push(m.systemInstructions);
        } else {
          lines.push("\n## System Instructions");
          lines.push("_System instructions are available to practice leaders and administrators only. To execute this methodology, ask Alexandria to run it for you — Claude will apply the full methodology without exposing the instructions directly._");
        }
      }

      if (m.steps?.length) {
        lines.push("\n## Steps");
        m.steps.forEach((step: Record<string, unknown>, i: number) => {
          lines.push(`\n### Step ${i + 1}: ${step.name}`);
          if (step.instructions) lines.push(step.instructions as string);
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
          // checkPrompt is internal — privileged only
          if (isPrivileged && qc.checkPrompt) lines.push(`  Internal check: "${qc.checkPrompt}"`);
        }
      }

      if (m.visionOfGood && isPrivileged) {
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

      if (m.tips && isPrivileged) {
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
          logoSvg,
          "logoImageUrl": logoImage.asset->url,
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

      // Build logo section — SVG preferred, raster URL as fallback
      const logoLines: string[] = [];
      if (p.logoSvg) {
        logoLines.push("## Logo (SVG)");
        logoLines.push("Embed inline in HTML using the SVG code below. You can recolor fills and strokes to match layout needs.");
        logoLines.push(p.logoSvg);
      } else if (p.logoImageUrl) {
        logoLines.push("## Logo (Image)");
        logoLines.push(`URL: ${p.logoImageUrl}`);
        logoLines.push("Use as an <img> src. Do not hotlink in production — practitioner should download and embed or serve from their own host.");
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
        return { content: [{ type: "text", text: header + logoSection + p.rawMarkdown }] };
      }

      // Fallback: build from structured fields
      const lines: string[] = [];
      lines.push(`# ${p.clientName} — Brand Package`);
      if (p.abbreviations) lines.push(`**Abbreviations:** ${p.abbreviations}`);
      if (p.sourceDocument) lines.push(`**Source:** ${p.sourceDocument}`);
      if (p.extractedDate) lines.push(`**Extracted:** ${p.extractedDate}`);
      if (p.gaps) lines.push(`\n⚠ **Extraction gaps:** ${p.gaps}`);
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
    "List available production templates in Alexandria. Returns title, format type, use cases, and feature list for each — enough for a practitioner to pick the right template without Claude explaining each one in prose. Optionally filter by format type.",
    {
      format_type: z.enum(["editorial-html", "slideshow-html", "web-landing-page", "word-document", "html-email"]).optional().describe("Filter by format type. Omit to return all active templates."),
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
        "editorial-html":   "Editorial HTML (scrolling, immersive, single-file)",
        "slideshow-html":   "Slideshow HTML (slide-by-slide, keyboard navigation)",
        "web-landing-page": "Web Landing Page",
        "word-document":    "Word Document",
        "html-email":       "HTML Email",
      };

      const lines: string[] = [`# Alexandria Templates (${templates.length} active)\n`];

      for (const t of templates) {
        lines.push(`## ${t.title}`);
        lines.push(`**Slug:** \`${t.slug}\``);
        lines.push(`**Format:** ${formatLabels[t.formatType] ?? t.formatType}`);
        if (t.previewUrl) lines.push(`**Preview:** ${t.previewUrl}`);
        if (t.useCases) lines.push(`\n**Use cases:** ${t.useCases}`);
        if (t.featureList) lines.push(`\n**Features:** ${t.featureList}`);
        lines.push("");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── alexandria_get_template ───────────────────────────────────────────────
  server.tool(
    "alexandria_get_template",
    "Get the full production template from Alexandria including all instructions Claude needs to produce a deliverable using this template. Returns fixed elements, variable elements, brand injection rules, client adaptation notes, output spec, and quality checks — assembled in the order Claude should read them. Use this after alexandria_list_templates to get the full template before starting production.",
    {
      slug: z.string().describe("The template slug OR plain-english name (e.g. 'scrolling-editorial-presentation', 'JDA Document Style'). Hyphens, underscores, and spaces are all accepted."),
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
          previewUrl, githubRawUrl, dropboxLink,
          useCases, featureList,
          fixedElements, variableElements, brandInjectionRules,
          clientAdaptationNotes, outputSpec, qualityChecks,
          "practiceAreas": practiceAreas[]->{ name, "slug": slug.current },
          "relatedMethodologies": relatedMethodologies[]->{ name, "slug": slug.current }
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

      const formatLabels: Record<string, string> = {
        "editorial-html":   "Editorial HTML — scrolling, immersive, single-file HTML",
        "slideshow-html":   "Slideshow HTML — slide-by-slide, keyboard navigation",
        "web-landing-page": "Web Landing Page",
        "word-document":    "Word Document (.docx)",
        "html-email":       "HTML Email",
      };

      const lines: string[] = [];

      lines.push(`# ${t.title}`);
      lines.push(`**Format:** ${formatLabels[t.formatType] ?? t.formatType}`);
      if (t.practiceAreas?.length) lines.push(`**Practice areas:** ${t.practiceAreas.map((p: { name: string }) => p.name).join(", ")}`);
      if (t.relatedMethodologies?.length) lines.push(`**Related methodologies:** ${t.relatedMethodologies.map((m: { name: string }) => m.name).join(", ")}`);

      if (t.previewUrl)    lines.push(`**Preview:** ${t.previewUrl}`);
      if (t.githubRawUrl)  lines.push(`**Source HTML (fetch this as starting point):** ${t.githubRawUrl}`);
      if (t.dropboxLink)   lines.push(`**Source file (Dropbox):** ${t.dropboxLink}`);

      if (t.useCases) {
        lines.push(`\n## Use Cases\n${t.useCases}`);
      }

      if (t.featureList) {
        lines.push(`\n## Features\n${t.featureList}`);
      }

      lines.push(`\n---\n## Production Instructions`);
      lines.push(`\nRead the following sections in order before producing any output.\n`);

      if (t.fixedElements) {
        lines.push(`### Fixed Elements (do not change)\n${t.fixedElements}`);
      }

      if (t.variableElements) {
        lines.push(`\n### Variable Elements (fill from brief and brand package)\n${t.variableElements}`);
      }

      if (t.brandInjectionRules) {
        lines.push(`\n### Brand Injection Rules\n${t.brandInjectionRules}`);
      }

      if (t.clientAdaptationNotes) {
        lines.push(`\n### Client Adaptation Notes\n${t.clientAdaptationNotes}`);
      }

      if (t.outputSpec) {
        lines.push(`\n### Output Specification\n${t.outputSpec}`);
      }

      if (t.qualityChecks) {
        lines.push(`\n### Quality Checks\nVerify all of the following before presenting output:\n${t.qualityChecks}`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
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
      if (auth.tier === "practitioner") {
        return { content: [{ type: "text", text: "Permission denied. Saving brand packages requires practice_leader or admin tier. Contact your administrator to request access." }], isError: true };
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
    "Returns your current identity and permission tier in Alexandria.",
    {},
    async () => {
      const [user] = await sql`SELECT name, email, tier, practice FROM users WHERE id = ${auth.userId}`;
      if (!user) return { content: [{ type: "text", text: "User not found." }], isError: true };
      return {
        content: [{
          type: "text",
          text: `Name: ${user.name ?? "—"}\nEmail: ${user.email ?? "—"}\nTier: ${user.tier}\nPractice: ${user.practice ?? "All"}`,
        }],
      };
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
      scope: "openid profile email User.Read",
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

    // Derive tier from Azure AD group membership — reject if not authorized
    const tier = tierFromGroups(profile.groups);
    if (!tier) {
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

    const userId = await upsertUser(profile.objectId, profile.email, profile.name, tier);

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
