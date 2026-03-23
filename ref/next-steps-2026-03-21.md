# Alexandria — Session Summary & Next Steps
**Date:** March 21, 2026

---

## Source of Truth

| What | Where |
|---|---|
| **Implementation plan** | `ref/portal-implementation-plan.md` — the canonical roadmap. Step sequence, content types, permission model, tech decisions. When in doubt, check here first. |
| **Codebase** | `/Users/brandon.travis/Development/jda-ai-portal` — monorepo on Railway. Portal (Next.js), MCP server (`mcp/`), Sanity schemas (`src/sanity/schemas/`), seed scripts (`scripts/`). |
| **Content** | Sanity Studio — production methodologies, client brand packages, practice areas. Live; MCP queries it on every request. |
| **MCP server** | `https://mcp-production-3192.up.railway.app` — deployed on Railway. Claude connects here via the Alexandria integration in Claude Settings. |
| **Portal** | `https://jda-alexandria-app-production.up.railway.app` — deployed on Railway. Azure AD gated. |

---

## What Was Built Tonight

### 1. Methodology #4 — Brand Package Extraction
Seeded into Sanity. Alexandria now serves this methodology to Claude on request.

**What it does:** Gives Claude a repeatable workflow for turning a client's brand guide PDF into a compact, Claude-readable markdown file (~300 lines, under 5,000 words) covering all seven brand sections: identity, color palette, typography, voice/tone, brand architecture, visual direction, key messaging.

**Why it matters:** This is the upstream step that feeds the brand resolution system. Without a brand package in Alexandria, Claude falls back to pulling brand from the client's website. With one loaded, every methodology for that client gets the real brand system automatically — correct colors, correct terminology, correct restrictions — from the first draft.

**Surface detection built in:** The methodology routes differently depending on where Claude is running:
- **Cowork / Code** — reads the PDF directly from the filesystem, no size limits
- **Chat (under 20MB)** — practitioner uploads the file directly
- **Chat (over 20MB)** — Claude routes to Cowork with a ready-to-paste prompt, or falls back to Dropbox link conversion

### 2. `clientBrandPackage` Sanity Document Type
New content type with structured fields for all seven brand sections plus a `rawMarkdown` field (the full extracted file). The `rawMarkdown` field is what Alexandria serves to Claude — compact and complete. Structured fields exist for Studio browsability and as a fallback.

### 3. Two New MCP Tools
Both live and deployed. Claude can call these now.

| Tool | What it does |
|---|---|
| `alexandria_list_brand_packages` | Lists all clients with brand packages in Alexandria. Used during Brand Resolution to check before asking the practitioner for a guide. |
| `alexandria_get_brand_package` | Fetches the full brand package for a client by slug. Returns `rawMarkdown` if present, falls back to structured fields. |

### 4. Brand Resolution (from previous session)
Already live in all three existing methodologies (pre-discovery brief, post-discovery brief, client strategy brief). The logic:

1. Check Alexandria for a client brand package (`alexandria_list_brand_packages` → `alexandria_get_brand_package`)
2. If found — use it, confirm with practitioner
3. If not found — ask practitioner for a guide
4. If no guide — pull from the client's website
5. If website unavailable — use JDA house style
6. Never invent a color palette

---

## How to Validate in Claude

### Validation 1 — Confirm the new tools exist
In any Claude surface with Alexandria connected:

> "Use Alexandria to list all brand packages."

**Expected:** Claude calls `alexandria_list_brand_packages` and returns "No client brand packages found in Alexandria." (Correct — none are loaded yet.)

---

### Validation 2 — Confirm methodology #4 is in Alexandria
In any Claude surface:

> "Use Alexandria to get the brand package extraction methodology."

**Expected:** Claude calls `alexandria_get_methodology` with slug `brand_package_extraction` and returns the full methodology — surface detection logic, the Cowork prompt, all 7 quality checks, 5 failure modes, etc.

---

### Validation 3 — Run the extraction (Claude Chat)
You need a client brand guide PDF under 20MB.

> "Run the brand package extraction methodology from Alexandria for [client name]."

Claude will:
1. Call Alexandria to get the methodology
2. Detect it's in Chat
3. Ask how large the file is
4. Ask you to upload it (if under 20MB) or route you to Cowork (if over 20MB)
5. Extract all seven sections and produce a markdown file

---

### Validation 4 — Run the extraction (Claude Cowork)
Best path for large PDFs. Open Cowork, point it at a folder containing the brand guide, then:

> "Run the brand package extraction methodology from Alexandria for [client name]."

Claude will read the PDF directly, extract everything, save the markdown file to the same folder, and give you a section-by-section summary with gaps flagged.

Alternatively, paste the standalone Cowork prompt directly (from `ref/methodology-4-brand-package-extraction.md`, the "Cowork Prompt" section) — it's self-contained and doesn't need Alexandria.

---

### Validation 5 — Load and verify Brand Resolution
Once you have a brand package markdown file from the extraction:

1. Go to Sanity Studio → Client Brand Packages → New
2. Fill in client name, slug (e.g. `heartbeat-international`), source document, extracted date
3. Paste the markdown into the `rawMarkdown` field
4. Publish

Then in Claude:
> "Run the post-discovery brief methodology for Heartbeat International."

**Expected:** Claude calls `alexandria_list_brand_packages`, finds HBI, calls `alexandria_get_brand_package`, and uses the real brand system. No invented palette. Correct colors, fonts, and terminology from the first draft.

---

## What Is NOT Done Yet (Step 1 Remaining)

### 1. Serialization Fix Confirmation
**Status:** The fix was pushed in a previous session (quality checks, failure modes, and tips were rendering as `[object Object]` because they're arrays of objects, not strings). Needs one verification pass in Claude — ask for any methodology and confirm quality checks and failure modes render correctly with names, descriptions, and internal prompts.

### 2. Permission Gating Verification
**Status:** `systemInstructions`, `visionOfGood`, `tips`, and quality check `checkPrompt` fields are gated to `practice_leader` and `admin` tiers in `alexandria_get_methodology`. Needs a test with a `practitioner`-tier account to confirm the gate returns the placeholder instead of the full content.

---

## What Was Just Completed (March 22)

### OAuth / Azure AD Practitioner Auth — DONE
Each practitioner now authenticates via Azure AD through Claude's custom connector OAuth flow. The MCP server acts as the OAuth authorization server — stores Claude's PKCE params, proxies to Azure AD, receives the callback, issues its own auth code to Claude, then exchanges it for a session token stored in PostgreSQL. Claude sends that token as a Bearer on every `/mcp` request. Confirmed working: Alexandria connected and responding to authenticated tool calls in Claude Chat.

**What this unlocks:** Per-user identity in every MCP request. Permission tiers (`practitioner`, `practice_leader`, `admin`) now apply to every tool call based on who is signed in — not a shared static key.

---

## What Comes Next (Step 2 Preview)

Per `ref/portal-implementation-plan.md`, Step 2 is:

**Templates + Client Brand Packages (full write-back)**

- Templates in Sanity — same pattern as methodologies
- MCP write tools gated to `practice_leader` and `admin` tiers
- `alexandria_save_brand_package` — so practice leaders can load a brand package directly from Claude without touching the portal
- Discovery session: what does a practice leader's workflow look like for creating/updating a brand package through Claude?

Step 2 depends on Step 1 OAuth being complete — write tools require per-user identity to scope permissions correctly.

---

## Current Alexandria Tool Inventory

| Tool | What it does | Who can call it |
|---|---|---|
| `alexandria_list_methodologies` | List all production methodologies, optionally filtered by practice | All |
| `alexandria_get_methodology` | Get full methodology by slug | All |
| `alexandria_list_practice_areas` | List all JDA practice areas | All |
| `alexandria_list_deliverables` | List deliverable classifications | All |
| `alexandria_list_brand_packages` | List all client brand packages | All |
| `alexandria_get_brand_package` | Get full brand package by client slug | All |
| `alexandria_whoami` | Returns your identity and permission tier | All |

All tools are currently read-only. Write tools are Step 2.
