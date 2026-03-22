import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createClient } from "@sanity/client";
import { createHash } from "crypto";
import { createServer, IncomingMessage, ServerResponse } from "http";
import postgres from "postgres";
import { z } from "zod";

// ── Environment validation ────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID;
if (!SANITY_PROJECT_ID) throw new Error("SANITY_PROJECT_ID is not set");

const SANITY_DATASET = process.env.SANITY_DATASET ?? "production";
const SANITY_API_VERSION = process.env.SANITY_API_VERSION ?? "2024-01-01";
const SANITY_API_TOKEN = process.env.SANITY_API_TOKEN;

// ── DB ────────────────────────────────────────────────────────────────────────

const isLocal = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");
const sql = postgres(DATABASE_URL, { ssl: isLocal ? false : "require" });

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

// ── Server factory ────────────────────────────────────────────────────────────
// One McpServer per request, scoped to the authenticated user's tier.

function buildServer(auth: AuthResult): McpServer {
  const server = new McpServer({
    name: "alexandria",
    version: "0.1.0",
  });

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
    "Get the full production methodology for a specific deliverable type. Returns complete instructions, steps, quality checks, and required inputs. This is the core IP — use this when a practitioner needs to produce a specific deliverable.",
    {
      slug: z.string().describe("The methodology slug (e.g. 'brand-voice-guide', 'executive-byline')"),
    },
    async ({ slug }) => {
      const query = `*[_type == "productionMethodology" && slug.current == $slug][0] {
        _id, name, "slug": slug.current, description,
        "practice": practice->{ name, "slug": slug.current },
        aiClassification, toolsInvolved, requiredInputs,
        systemInstructions, steps, outputFormat,
        qualityChecks, failureModes, visionOfGood, tips,
        clientRefinements, provenStatus, version, author, validatedBy
      }`;

      const m = await sanity.fetch(query, { slug });

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

      if (m.systemInstructions) {
        lines.push("\n## System Instructions");
        lines.push(m.systemInstructions);
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
          if (qc.checkPrompt) lines.push(`  Internal check: "${qc.checkPrompt}"`);
        }
      }

      if (m.visionOfGood) {
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

      if (m.tips) {
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
    "Get the full brand package for a specific client from Alexandria. Returns the complete brand system — colors, typography, voice, messaging, and architecture restrictions — as a structured markdown document. Use this during Brand Resolution when a package exists for the client.",
    {
      slug: z.string().describe("The client slug (e.g. 'heartbeat-international'). Use alexandria_list_brand_packages to find the correct slug."),
    },
    async ({ slug }) => {
      const p = await sanity.fetch(
        `*[_type == "clientBrandPackage" && slug.current == $slug][0] {
          _id, clientName, "slug": slug.current, abbreviations,
          extractedDate, sourceDocument, extractedBy, gaps,
          rawMarkdown,
          identity, colorPalette, colorUsageRules,
          typography, voiceAndTone, brandArchitecture,
          visualDirection, keyMessaging
        }`,
        { slug }
      );

      if (!p) {
        return {
          content: [{ type: "text", text: `No brand package found for client slug: ${slug}. Use alexandria_list_brand_packages to see available clients.` }],
          isError: true,
        };
      }

      // If a full markdown file is stored, return it directly — it's the most compact and complete representation
      if (p.rawMarkdown) {
        const header = [
          `# ${p.clientName} — Brand Package`,
          p.abbreviations ? `**Abbreviations:** ${p.abbreviations}` : null,
          p.sourceDocument ? `**Source:** ${p.sourceDocument}` : null,
          p.extractedDate ? `**Extracted:** ${p.extractedDate}` : null,
          p.gaps ? `\n⚠ **Extraction gaps:** ${p.gaps}` : null,
          "\n---\n",
        ].filter(Boolean).join("\n");

        return { content: [{ type: "text", text: header + p.rawMarkdown }] };
      }

      // Fallback: build from structured fields
      const lines: string[] = [];
      lines.push(`# ${p.clientName} — Brand Package`);
      if (p.abbreviations) lines.push(`**Abbreviations:** ${p.abbreviations}`);
      if (p.sourceDocument) lines.push(`**Source:** ${p.sourceDocument}`);
      if (p.extractedDate) lines.push(`**Extracted:** ${p.extractedDate}`);
      if (p.gaps) lines.push(`\n⚠ **Extraction gaps:** ${p.gaps}`);

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
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "alexandria-mcp" }));
    return;
  }

  const pathname = new URL(req.url!, `http://localhost`).pathname;
  if (pathname !== "/mcp") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  // Accept key from Authorization: Bearer <key> or ?key=<key>
  const authHeader = req.headers["authorization"] ?? "";
  const urlObj = new URL(req.url!, `http://localhost`);
  const apiKey = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : urlObj.searchParams.get("key") ?? "";

  if (!apiKey) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing API key. Use Authorization: Bearer <key> or ?key=<key>" }));
    return;
  }

  const auth = await resolveApiKey(apiKey);
  if (!auth) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid API key" }));
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
  console.log(`Alexandria MCP server running on port ${PORT}`);
});
