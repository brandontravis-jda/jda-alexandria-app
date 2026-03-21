import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createClient } from "@sanity/client";
import { createHash } from "crypto";
import { createServer } from "http";
import postgres from "postgres";
import { z } from "zod";
// ── Environment validation ────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL)
    throw new Error("DATABASE_URL is not set");
const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID;
if (!SANITY_PROJECT_ID)
    throw new Error("SANITY_PROJECT_ID is not set");
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
async function resolveApiKey(apiKey) {
    const keyHash = createHash("sha256").update(apiKey).digest("hex");
    const [row] = await sql `
    SELECT k.id AS key_id, u.id AS user_id, u.tier, u.practice
    FROM api_keys k
    JOIN users u ON u.id = k.user_id
    WHERE k.key_hash = ${keyHash}
  `;
    if (!row)
        return null;
    await sql `UPDATE api_keys SET last_used_at = NOW() WHERE id = ${row.key_id}`;
    return {
        userId: row.user_id,
        tier: row.tier,
        practice: row.practice,
    };
}
// ── Server factory ────────────────────────────────────────────────────────────
// One McpServer per request, scoped to the authenticated user's tier.
function buildServer(auth) {
    const server = new McpServer({
        name: "alexandria",
        version: "0.1.0",
    });
    // ── alexandria_list_methodologies ─────────────────────────────────────────
    server.tool("alexandria_list_methodologies", "List production methodologies from Alexandria. Optionally filter by practice area. Returns name, slug, AI classification, and proven status.", {
        practice: z.string().optional().describe("Practice area slug to filter by (e.g. 'brand-strategy', 'content-marketing')"),
    }, async ({ practice }) => {
        let query;
        let params;
        if (practice) {
            query = `*[_type == "productionMethodology" && practice->slug.current == $practice] | order(name asc) {
          _id, name, "slug": slug.current, aiClassification, provenStatus, version,
          "practice": practice->name
        }`;
            params = { practice };
        }
        else {
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
        const text = rows.map((m) => `• ${m.name} [${m.slug}]\n  Practice: ${m.practice ?? "Unassigned"} | Classification: ${m.aiClassification ?? "—"} | Status: ${m.provenStatus ?? "—"} | v${m.version ?? "1.0"}`).join("\n\n");
        return { content: [{ type: "text", text }] };
    });
    // ── alexandria_get_methodology ─────────────────────────────────────────────
    server.tool("alexandria_get_methodology", "Get the full production methodology for a specific deliverable type. Returns complete instructions, steps, quality checks, and required inputs. This is the core IP — use this when a practitioner needs to produce a specific deliverable.", {
        slug: z.string().describe("The methodology slug (e.g. 'brand-voice-guide', 'executive-byline')"),
    }, async ({ slug }) => {
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
        const lines = [];
        lines.push(`# ${m.name}`);
        if (m.description)
            lines.push(`\n${m.description}`);
        lines.push(`\n**Practice:** ${m.practice?.name ?? "Unassigned"}`);
        lines.push(`**Classification:** ${m.aiClassification ?? "—"} | **Status:** ${m.provenStatus ?? "—"} | **Version:** ${m.version ?? "1.0"}`);
        if (m.toolsInvolved?.length)
            lines.push(`**Tools:** ${m.toolsInvolved.join(", ")}`);
        if (m.requiredInputs?.length) {
            lines.push("\n## Required Inputs");
            for (const input of m.requiredInputs) {
                lines.push(`- **${input.name}**${input.required ? " (required)" : " (optional)"}`);
                if (input.description)
                    lines.push(`  ${input.description}`);
                if (input.promptText)
                    lines.push(`  → Claude asks: "${input.promptText}"`);
            }
        }
        if (m.systemInstructions) {
            lines.push("\n## System Instructions");
            lines.push(m.systemInstructions);
        }
        if (m.steps?.length) {
            lines.push("\n## Steps");
            m.steps.forEach((step, i) => {
                lines.push(`\n### Step ${i + 1}: ${step.name}`);
                if (step.instructions)
                    lines.push(step.instructions);
                if (step.approvalGate) {
                    lines.push(`⏸ **Approval gate** — pause for practitioner review`);
                    if (step.gatePrompt)
                        lines.push(`Gate prompt: "${step.gatePrompt}"`);
                    if (step.iterationProtocol)
                        lines.push(`Iteration: ${step.iterationProtocol}`);
                }
            });
        }
        if (m.outputFormat) {
            lines.push("\n## Output Format");
            lines.push(m.outputFormat);
        }
        if (m.qualityChecks?.length) {
            lines.push("\n## Quality Checks");
            for (const qc of m.qualityChecks)
                lines.push(`- ${qc}`);
        }
        if (m.visionOfGood) {
            lines.push("\n## Vision of Good");
            lines.push(m.visionOfGood);
        }
        if (m.failureModes?.length) {
            lines.push("\n## Common Failure Modes");
            for (const fm of m.failureModes)
                lines.push(`- ${fm}`);
        }
        if (m.tips?.length) {
            lines.push("\n## Tips");
            for (const tip of m.tips)
                lines.push(`- ${tip}`);
        }
        if (m.clientRefinements) {
            lines.push("\n## Client Refinements");
            lines.push(m.clientRefinements);
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
    });
    // ── alexandria_list_practice_areas ────────────────────────────────────────
    server.tool("alexandria_list_practice_areas", "List all JDA practice areas in Alexandria.", {}, async () => {
        const rows = await sanity.fetch(`*[_type == "practiceArea"] | order(name asc) { _id, name, "slug": slug.current, activationStatus }`, {});
        if (!rows || rows.length === 0) {
            return { content: [{ type: "text", text: "No practice areas found." }] };
        }
        const text = rows.map((p) => `• ${p.name} [${p.slug}] — ${p.activationStatus ?? "—"}`).join("\n");
        return { content: [{ type: "text", text }] };
    });
    // ── alexandria_list_deliverables ──────────────────────────────────────────
    server.tool("alexandria_list_deliverables", "List deliverable classifications from Alexandria. Optionally filter by practice area.", {
        practice: z.string().optional().describe("Practice area slug to filter by"),
    }, async ({ practice }) => {
        let query;
        let params;
        if (practice) {
            query = `*[_type == "deliverableClassification" && practiceArea->slug.current == $practice] | order(name asc) {
          _id, name, "slug": slug.current, aiClassification, "practiceArea": practiceArea->name
        }`;
            params = { practice };
        }
        else {
            query = `*[_type == "deliverableClassification"] | order(name asc) {
          _id, name, "slug": slug.current, aiClassification, "practiceArea": practiceArea->name
        }`;
            params = {};
        }
        const rows = await sanity.fetch(query, params);
        if (!rows || rows.length === 0) {
            return { content: [{ type: "text", text: "No deliverable classifications found." }] };
        }
        const text = rows.map((d) => `• ${d.name} [${d.slug}] — ${d.aiClassification ?? "—"} | Practice: ${d.practiceArea ?? "Unassigned"}`).join("\n");
        return { content: [{ type: "text", text }] };
    });
    // ── alexandria_whoami ─────────────────────────────────────────────────────
    server.tool("alexandria_whoami", "Returns your current identity and permission tier in Alexandria.", {}, async () => {
        const [user] = await sql `SELECT name, email, tier, practice FROM users WHERE id = ${auth.userId}`;
        if (!user)
            return { content: [{ type: "text", text: "User not found." }], isError: true };
        return {
            content: [{
                    type: "text",
                    text: `Name: ${user.name ?? "—"}\nEmail: ${user.email ?? "—"}\nTier: ${user.tier}\nPractice: ${user.practice ?? "All"}`,
                }],
        };
    });
    return server;
}
// ── HTTP server ───────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const httpServer = createServer(async (req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "alexandria-mcp" }));
        return;
    }
    const pathname = new URL(req.url, `http://localhost`).pathname;
    if (pathname !== "/mcp") {
        res.writeHead(404);
        res.end("Not found");
        return;
    }
    // Accept key from Authorization: Bearer <key> or ?key=<key>
    const authHeader = req.headers["authorization"] ?? "";
    const urlObj = new URL(req.url, `http://localhost`);
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
