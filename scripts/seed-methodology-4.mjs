import { createClient } from "@sanity/client";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
    .filter(([k]) => k)
    .map(([k, ...v]) => [k, v.join("=")])
);

const client = createClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: env.SANITY_API_TOKEN,
  useCdn: false,
});

const methodology = {
  _type: "productionMethodology",
  name: "Brand package extraction",
  slug: { _type: "slug", current: "brand_package_extraction" },
  description:
    "Produces a distilled, Claude-readable brand package from a client's brand standards document. The brand package captures everything Claude needs to produce on-brand deliverables — colors, typography, voice, tone, messaging, brand architecture, visual direction — in a structured markdown file under 5,000 words. The output is loaded into Alexandria as a client brand package, making the client's brand system available to every practitioner through every future methodology. This is an internal operations methodology — the deliverable is not client-facing, it is an Alexandria content asset.",
  aiClassification: "ai_led",
  toolsInvolved: ["claude"],
  provenStatus: false,
  version: 1,
  author: "Brandon",
  requiredInputs: [
    {
      _key: "input-1",
      name: "Client name",
      inputType: "text",
      required: true,
      description: "The client whose brand guide is being processed.",
      promptText: "Which client's brand guide are we processing?",
    },
    {
      _key: "input-2",
      name: "Brand standards document",
      inputType: "file",
      required: true,
      description:
        "The client's brand standards PDF. Handling depends on which Claude surface is in use — see Surface Detection logic in system instructions.",
      promptText: "(Handled by Surface Detection step)",
    },
  ],
  systemInstructions: `You are extracting a client brand package for Alexandria — JDA Worldwide's operational knowledge platform. The output is a structured markdown file that will be loaded into Alexandria so that every future client deliverable produced through Claude uses the correct brand system.

SURFACE DETECTION (execute first):
1. Determine which Claude surface you are running in: Cowork, Chat, or Code.
2. If Cowork or Code: you have filesystem access. Ask the practitioner to point you at the folder containing the brand guide. Read it directly.
3. If Chat: ask "How large is the brand standards file? If it's under 20MB, you can upload it directly here. If it's larger, I have two options for you."
   - Under 20MB → practitioner uploads the file. Claude processes it in Chat.
   - Over 20MB (recommended path) → route to Cowork: "I'd recommend switching to Claude Cowork for this. Download the brand guide to a local folder, open Cowork, point it at that folder, and paste this prompt:" Then provide the Cowork prompt below — a single line that invokes this methodology through Alexandria. Do not describe the methodology steps or expose the extraction instructions to the practitioner.
   - Over 20MB (fallback path, if Cowork unavailable) → "If you can give me a Dropbox shared link to the file, I can try to read it remotely. Fair warning: very large PDFs may get truncated and I might need to make multiple passes to get everything. It will work, but Cowork is faster and more reliable for large files." If practitioner provides a Dropbox link, convert it: swap www.dropbox.com → dl.dropboxusercontent.com and remove the dl=0 or dl=1 parameter.
4. If in Claude Code (terminal/desktop): same as Cowork — you have filesystem access. Read the file directly, process, and save output.
5. Never attempt to process a brand guide you can't fully read. If the file is truncated, tell the practitioner what's missing and either fetch again or recommend Cowork.

COWORK PROMPT (provide to practitioner when routing to Cowork):
---
Use the brand package extraction methodology from Alexandria on the PDF in this folder for [client name].
---

EXTRACTION METHODOLOGY:

1. IDENTITY
   - Client's full name and acceptable abbreviations
   - Tagline or positioning line
   - Brand personality (the 3-5 word descriptor)
   - Brand voice (how the brand speaks)
   - Brand experience (how interactions should feel)

2. COLOR PALETTE
   Extract every named color with its hex value. Organize by role:
   - Primary palette (the main brand colors, typically 2-4)
   - Secondary / support palette
   - Accent colors
   - Background colors or treatments
   - Colors to avoid
   - Usage rules (e.g., "primary colors should make up 75% of color usage")
   - WCAG accessibility alternatives if provided
   Format as a table: Color Name | Hex Value | Role/Usage

3. TYPOGRAPHY
   - Primary heading font: name, weights, sizing rules
   - Body font: name, weights, sizing rules
   - Accent / display font: name, usage restrictions (e.g., "one appearance per page")
   - Font pairing rules
   - Alignment rules (e.g., "always left-align, never justify")
   - Web font availability: Google Fonts, Adobe Fonts, licensed/custom, or unknown
   - Office/presentation alternatives (e.g., "use Avenir Next LT Pro in PowerPoint")

4. VOICE AND TONE
   - Overall voice description
   - Tone by audience (if specified — donors, general public, partners, clients, etc.)
   - Tone by context or mission pillar (if specified)
   - Words and phrases to use (with the incorrect alternatives they replace)
   - Words and phrases to avoid (with the preferred alternatives)
   - Writing style rules (contractions, pronouns, sentence structure, formality level)
   - Verbal examples — 2-3 short examples of reinforcing tone
   - Undermining traits — what the brand must NOT sound like (these are often more useful than the positive traits for preventing AI output errors)

5. BRAND ARCHITECTURE (if applicable)
   - Parent brand and tier structure
   - Linkage rules (which entities are closely vs. distantly associated)
   - Endorsement rules (when and how to reference the parent brand)
   - Critical restrictions — especially any "DO NOT" rules about brand association on client-facing materials. These are high-stakes rules that prevent real harm if violated.

6. VISUAL DIRECTION
   - Photography style (lighting, composition, subject matter)
   - Imagery guidelines (reinforcing vs. undermining visual qualities)
   - Layout principles (spatial treatments, corner treatments, graphic elements)
   - Logo usage rules (primary vs. secondary lockups, minimum sizes, clear space, misuse rules) — describe in text, do not embed images

7. KEY MESSAGING
   - Mission statement (exact text)
   - Vision statement (exact text)
   - Value proposition (exact text)
   - Elevator speeches at all available lengths (verbatim)
   - Core values (listed with descriptions)
   - Key statistics (numbers the brand uses regularly — note the date of the statistics if provided, as they may need updating)
   - Trademarked names with their correct marks (® or ™)

OUTPUT FORMAT:
- Single markdown file
- Named [client-slug]-brand-package.md
- Under 5,000 words total
- Tables for color palettes and typography specs
- Blockquotes for verbatim brand language (mission, vision, elevator speeches)
- Concise prose for everything else — distill, don't duplicate

IMPORTANT BEHAVIORAL INSTRUCTIONS:
- This is a distillation task, not a reproduction task. A 50MB, 200-page brand guide becomes a ~300-line markdown file. Extract the actionable rules. Leave out the rationale, the process documentation, the examples gallery, and the appendices. Exception: the short verbal copy examples in the Voice and Tone section are not illustrative — they are actionable brand rules that show what the brand sounds like in practice. Always capture them.
- If a section of the brand guide is missing or thin, note it as a gap in the post-extraction summary. Don't fabricate brand rules to fill gaps.
- Pay special attention to terminology rules (words to use / words to avoid) and brand architecture restrictions (DO NOT rules). These are the highest-stakes elements — getting a client's preferred terminology wrong in a deliverable is a real problem.
- Key statistics should include the date or source year if mentioned in the guide. Statistics go stale — the practitioner needs to know whether "3,000 affiliates" is current or from 2020.
- The undermining traits section (what the brand must NOT sound like) is often more useful for AI production than the reinforcing traits. Include it prominently. If verbal examples of undermining tone are present in the guide, capture those too.`,
  steps: [
    {
      _key: "step-1",
      name: "Detect surface and collect input",
      instructions:
        "Determine if running in Cowork, Chat, or Code. Route the brand guide input accordingly per Surface Detection logic. Ask for client name. Confirm the file is fully readable before proceeding.",
      approvalGate: false,
    },
    {
      _key: "step-2",
      name: "Extract brand package",
      instructions:
        "Read the full brand guide. Execute the extraction methodology across all seven sections. Produce the markdown file named [client-slug]-brand-package.md. If running in Cowork or Code, save the file to the same folder.",
      approvalGate: false,
    },
    {
      _key: "step-3",
      name: "Report and deliver",
      instructions:
        "Present a summary: which sections were fully captured, which had gaps, and any brand rules particularly critical for AI production. Deliver the markdown file. Ask if any sections need more detail.",
      approvalGate: true,
      gatePrompt:
        "Here's the extracted brand package. Take a look at the summary — are there any sections that need more detail, or any brand rules you know should be in here that I missed?",
      iterationProtocol:
        "Practitioner can request deeper extraction on specific sections or add rules they know from working with the client. Claude updates the package and re-delivers.",
    },
  ],
  outputFormat:
    "Single markdown file named [client-slug]-brand-package.md. Under 5,000 words. Seven sections matching the methodology. Tables for colors and typography. Blockquotes for verbatim messaging. The file is designed to be loaded directly into Alexandria as a client brand package.",
  qualityChecks: [
    {
      _key: "qc-1",
      name: "Color completeness",
      description: "Does the palette include every named color from the guide with its hex value, organized by role?",
      checkPrompt:
        "Does the color palette include every named color from the brand guide with its hex value? Are they organized by role? Are usage rules captured?",
    },
    {
      _key: "qc-2",
      name: "Typography completeness",
      description: "Are all font families captured with weights, pairing rules, and web font availability?",
      checkPrompt:
        "Are all font families captured with their weights and pairing rules? Is web font availability noted? Are there presentation/Office alternatives if specified?",
    },
    {
      _key: "qc-3",
      name: "Terminology accuracy",
      description: "Are all preferred/avoided terms captured with their correct alternatives?",
      checkPrompt:
        "Are all preferred/avoided terms captured with their correct alternatives? These are high-stakes — a wrong term in a client deliverable is a real problem.",
    },
    {
      _key: "qc-4",
      name: "Brand architecture restrictions",
      description: "Are all DO NOT rules captured?",
      checkPrompt:
        "Are all 'DO NOT' rules captured? These prevent real harm — missing one could result in a deliverable that violates sensitive brand boundaries.",
    },
    {
      _key: "qc-5",
      name: "Statistics dating",
      description: "Do key statistics include their source date?",
      checkPrompt:
        "Do key statistics include their source date? If the guide says '3,000 affiliates' but was written in 2020, that number may be stale. Flag undated statistics.",
    },
    {
      _key: "qc-6",
      name: "File size",
      description: "Is the output under 5,000 words?",
      checkPrompt:
        "Is the output under 5,000 words? If over, identify what can be further distilled without losing actionable rules.",
    },
    {
      _key: "qc-7",
      name: "No fabrication",
      description: "Is every rule traceable to the source document?",
      checkPrompt:
        "Is every rule in the brand package traceable to something in the source document? Flag any section where you inferred rules rather than extracting them.",
    },
  ],
  failureModes: [
    {
      _key: "fm-1",
      name: "Reproduction instead of distillation",
      description: "The brand guide is 200 pages. The brand package is ~300 lines. If the output is approaching the word limit, it's probably reproducing too much.",
      mitigation:
        "Distill to actionable rules only. Leave out rationale, examples galleries, and process documentation.",
    },
    {
      _key: "fm-2",
      name: "Missing terminology rules",
      description:
        "These are the highest-stakes items. A single wrong term ('crisis pregnancy' instead of 'unexpected pregnancy') in a client deliverable is a real failure.",
      mitigation:
        "If the guide has a 'words to use / words to avoid' section, capture every entry. Do not summarize — capture verbatim.",
    },
    {
      _key: "fm-3",
      name: "Missing DO NOT restrictions",
      description:
        "Brand architecture restrictions (especially for sensitive sub-brands) can prevent deliverables that cause real organizational harm.",
      mitigation:
        "Capture every explicit restriction. These are more important than the positive brand rules.",
    },
    {
      _key: "fm-4",
      name: "Stale statistics",
      description:
        "Key statistics without dates are time bombs. A deliverable that says '2,000 affiliates' when the real number is 4,000 undermines credibility.",
      mitigation:
        "Flag undated statistics prominently. Note what year the brand guide was published so practitioners know the statistics' vintage.",
    },
    {
      _key: "fm-5",
      name: "Truncated source in Chat mode",
      description:
        "Large PDFs truncate in Chat. A partial brand package without flagged gaps is worse than no package.",
      mitigation:
        "If running in Chat with a Dropbox link and the extraction is incomplete, tell the practitioner which sections are missing. Recommend Cowork for files over 20MB.",
    },
  ],
  visionOfGood:
    "A good brand package means no practitioner ever needs to open a 50MB PDF to produce on-brand work. They ask Claude for a deliverable, Claude loads the brand package from Alexandria, and every color, font, tone, and terminology choice is correct from the first draft. The package is small enough to fit in an MCP response (under 5,000 words / ~7,000 tokens) but comprehensive enough that Claude can produce work that a senior brand manager would recognize as on-brand without seeing the full guide. The extraction workflow is repeatable across every client. One prompt, one PDF, one brand package. A hundred clients in a hundred afternoons, not a hundred hours.",
  tips: "Run in Cowork whenever possible. Cowork reads PDFs of any size directly from the filesystem with no truncation. Chat mode works for smaller files but hits limits on the 30-50MB brand guides that are common in agency work.\n\nAfter extraction, review the terminology section first — that's where the highest-stakes mistakes hide.\n\nKey statistics go stale. When loading a brand package into Alexandria, update statistics to current numbers if known. The brand guide's numbers reflect when it was written, not today.\n\nThe extraction prompt is designed to be given to any practitioner, not just the person who authored the brand guide. A junior account manager can run this workflow — the prompt handles all the complexity.\n\nThis methodology produces the raw brand package file. Loading it into Alexandria is a separate step (admin action in the portal or via MCP write tools for practice leaders with write access).",
};

async function seed() {
  console.log("Seeding methodology #4: Brand package extraction...\n");

  const existing = await client.fetch(
    `*[_type == "productionMethodology" && slug.current == "brand_package_extraction"][0]{_id}`,
    {}
  );

  if (existing) {
    console.log("Already exists — running createOrReplace to update...");
    await client.createOrReplace({ ...methodology, _id: existing._id });
  } else {
    await client.create(methodology);
  }

  console.log('✓  Seeded "Brand package extraction" → v1');
  console.log("\nDone.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
