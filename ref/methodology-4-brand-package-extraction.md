# Production Methodology #4: Brand Package Extraction

---

### Metadata

| Field | Value |
|---|---|
| **name** | Brand package extraction |
| **slug** | `brand_package_extraction` |
| **practice** | Agency-Wide (internal operations) |
| **ai_classification** | AI-Led |
| **proven_status** | false (validated once with HBI — needs two more client extractions for Proven Status) |
| **author** | Brandon |
| **tools_involved** | Claude (Chat or Cowork) |

### Description

Produces a distilled, Claude-readable brand package from a client's brand standards document. The brand package captures everything Claude needs to produce on-brand deliverables — colors, typography, voice, tone, messaging, brand architecture, visual direction — in a structured markdown file under 5,000 words. The output is designed to be loaded into Alexandria as a client brand package, making the client's brand system available to every practitioner through every future methodology.

This is an internal operations methodology. The deliverable is not client-facing — it is an Alexandria content asset.

### Required Inputs

| Input | Type | Required | Description | How Claude asks |
|---|---|---|---|---|
| Client name | Text | Yes | The client whose brand guide is being processed | "Which client's brand guide are we processing?" |
| Brand standards document | File / URL | Yes | The client's brand standards PDF. See Surface Detection logic below for how to handle this based on where the practitioner is working. | *(Handled by Surface Detection step)* |

### Surface Detection and Input Routing

This methodology works differently depending on which Claude surface the practitioner is using. Claude must detect the surface and route accordingly.

**If in Claude Cowork (local filesystem access):**
1. Ask the practitioner to point Cowork at the folder containing the brand standards PDF
2. Read the PDF directly from the local filesystem — no size limits, no truncation
3. Execute the extraction methodology
4. Save the output markdown file to the same folder
5. Instruct the practitioner to load the output into Alexandria

**If in Claude Chat (no local filesystem access):**
1. Ask: "How large is the brand standards file? If it's under 20MB, you can upload it directly here. If it's larger, I have two options for you."
2. **Under 20MB:** Practitioner uploads the file. Claude processes it in Chat. Proceed with extraction.
3. **Over 20MB — recommended path:** "I'd recommend switching to Claude Cowork for this. Download the brand guide to a local folder, open Cowork, point it at that folder, and tell it to run the brand package extraction. Cowork can read files of any size directly from your computer — no upload limits, no truncation. Here's what to say:" Then provide the Cowork prompt (see below).
4. **Over 20MB — fallback path (if practitioner can't use Cowork):** "If you can give me a Dropbox shared link to the file, I can try to read it remotely. Fair warning: very large PDFs may get truncated and I might need to make multiple passes to get everything. It will work, but Cowork is faster and more reliable for large files."
5. If the practitioner provides a Dropbox link, convert it: swap `www.dropbox.com` → `dl.dropboxusercontent.com` and remove the `dl=0` or `dl=1` parameter. Fetch with PDF text extraction. If truncated, fetch again with a higher token limit or inform the practitioner which sections are missing.

**If in Claude Code (terminal/desktop):**
1. Same as Cowork — Claude has filesystem access. Read the file directly, process, and save output.

### Cowork Prompt (provided to practitioner when routing to Cowork)

When Claude routes a practitioner to Cowork, provide this prompt for them to paste. The prompt invokes the methodology through Alexandria — the practitioner never sees the extraction instructions.

---

Use the brand package extraction methodology from Alexandria on the PDF in this folder for [client name].

---

### System Instructions

```
You are extracting a client brand package for Alexandria — JDA Worldwide's operational knowledge platform. The output is a structured markdown file that will be loaded into Alexandria so that every future client deliverable produced through Claude uses the correct brand system.

SURFACE DETECTION (execute first):
1. Determine which Claude surface you are running in (Cowork, Chat, or Code)
2. If Cowork or Code: you have filesystem access. Ask the practitioner to point you at the folder containing the brand guide. Read it directly.
3. If Chat: ask about file size. Under 20MB → upload. Over 20MB → recommend Cowork (provide the Cowork prompt). Dropbox link as fallback.
4. Never attempt to process a brand guide you can't fully read. If the file is truncated, tell the practitioner what's missing and either fetch again or recommend Cowork.

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
- The undermining traits section (what the brand must NOT sound like) is often more useful for AI production than the reinforcing traits. Include it prominently. If verbal examples of undermining tone are present in the guide, capture those too.
```

### Steps

| Step | Name | Instructions | Approval Gate |
|---|---|---|---|
| 1 | Detect surface and collect input | Determine if running in Cowork, Chat, or Code. Route the brand guide input accordingly per Surface Detection logic. | No |
| 2 | Extract brand package | Read the full brand guide. Execute the extraction methodology across all seven sections. Produce the markdown file. | No |
| 3 | Report and deliver | Present a summary: which sections were fully captured, which had gaps, and any brand rules particularly critical for AI production. Deliver the markdown file. | Yes — "Here's the extracted brand package. Take a look at the summary — are there any sections that need more detail, or any brand rules I missed that you know should be in here?" |

### Output Format

Single markdown file named `[client-slug]-brand-package.md`. Under 5,000 words. Seven sections matching the methodology. Tables for colors and typography. Blockquotes for verbatim messaging. The file is designed to be loaded directly into Alexandria as a client brand package.

### Quality Checks

| Check | Internal Prompt |
|---|---|
| Color completeness | "Does the color palette include every named color from the brand guide with its hex value? Are they organized by role? Are usage rules captured?" |
| Typography completeness | "Are all font families captured with their weights and pairing rules? Is web font availability noted? Are there presentation/Office alternatives if specified?" |
| Terminology accuracy | "Are all preferred/avoided terms captured with their correct alternatives? These are high-stakes — a wrong term in a client deliverable is a real problem." |
| Brand architecture restrictions | "Are all 'DO NOT' rules captured? These prevent real harm — missing one could result in a deliverable that violates sensitive brand boundaries." |
| Statistics dating | "Do key statistics include their source date? If the guide says '3,000 affiliates' but was written in 2020, that number may be stale. Flag undated statistics." |
| File size | "Is the output under 5,000 words? If over, identify what can be further distilled without losing actionable rules." |
| No fabrication | "Is every rule in the brand package traceable to something in the source document? Flag any section where you inferred rules rather than extracting them." |

### Failure Modes

| Failure Mode | Mitigation |
|---|---|
| Reproduction instead of distillation | The brand guide is 200 pages. The brand package is ~300 lines. If the output is approaching the word limit, it's probably reproducing too much. Distill to actionable rules only. |
| Missing terminology rules | These are the highest-stakes items. If the guide has a "words to use / words to avoid" section, capture every entry. A single wrong term ("crisis pregnancy" instead of "unexpected pregnancy") in a client deliverable is a real failure. |
| Missing DO NOT restrictions | Brand architecture restrictions (especially for sensitive sub-brands) can prevent deliverables that cause real organizational harm. Capture every explicit restriction. |
| Stale statistics | Key statistics without dates are time bombs. A deliverable that says "2,000 affiliates" when the real number is 4,000 undermines credibility. Flag undated stats prominently. |
| Truncated source (Chat mode) | Large PDFs truncate in Chat. If running in Chat with a Dropbox link and the extraction is incomplete, tell the practitioner which sections are missing. Don't deliver a partial brand package without flagging the gaps. |

### Vision of Good

A good brand package means no practitioner ever needs to open a 50MB PDF to produce on-brand work. They ask Claude for a deliverable, Claude loads the brand package from Alexandria, and every color, font, tone, and terminology choice is correct from the first draft. The package is small enough to fit in an MCP response (under 5,000 words / ~7,000 tokens) but comprehensive enough that Claude can produce work that Andrea Trudden would recognize as on-brand without seeing the full guide.

The extraction workflow is repeatable across every client. One prompt, one PDF, one brand package. A hundred clients in a hundred afternoons, not a hundred hours.

### Tips

- Run in Cowork whenever possible. Cowork reads PDFs of any size directly from the filesystem with no truncation. Chat mode works for smaller files but hits limits on the 30-50MB brand guides that are common in agency work.
- After extraction, review the terminology section first — that's where the highest-stakes mistakes hide.
- Key statistics go stale. When loading a brand package into Alexandria, update statistics to current numbers if known. The brand guide's numbers reflect when it was written, not today.
- The extraction prompt is designed to be given to any practitioner, not just the person who authored the brand guide. A junior account manager can run this workflow — the prompt handles all the complexity.
- This methodology produces the raw brand package file. Loading it into Alexandria is a separate step (admin action in the portal or via MCP write tools for practice leaders with write access).

### Client Refinements

None — this is an internal operations methodology. Client-specific adjustments are captured in the brand package output itself, not in the methodology.

---

*This is the first internal operations methodology in Alexandria. It creates the content (client brand packages) that all other client-facing methodologies consume. The workflow: Cowork extracts → markdown file produced → loaded into Alexandria → every future deliverable for this client is automatically branded correctly.*
