# Alexandria Platform — Step 2 Implementation Plan
## Templates + Client Brand Packages

> Follows the discovery session completed March 23, 2026. Supersedes any prior Step 2 notes. Step 1 status: complete — Portal → Sanity → MCP → Claude → practitioner validated end-to-end with HBI post-discovery brief.

---

## 1. Context

Step 1 proved the full system works. The HBI proof-of-concept closed the read/write loop: extraction methodology ran in Cowork, brand package landed in Alexandria, post-discovery brief produced on-brand output using real HBI colors and voice.

Step 2 adds two content types:

1. **Client Brand Packages** — adds the write tool (`alexandria_save_brand_package`) that closes the extraction → save → available loop
2. **Templates** — new content type; gives practitioners a browseable library of repeatable production formats

Both content types follow the same discovery → build → test pattern established in Step 1.

---

## 2. Client Brand Packages

### 2.1 What It Is

A distilled, Claude-readable brand system for a specific client. Not the brand guidelines PDF — the extracted intelligence from that PDF, structured so any methodology automatically produces on-brand output for that client.

The HBI brand package in Alexandria is the reference implementation: identity, color palette, typography, voice and tone, critical word choices, brand architecture rules, key messaging, visual direction. Everything Claude needs without touching the raw PDF.

### 2.2 Sanity Schema

The schema is already built in Step 1. No changes needed. The `content` field is a single structured markdown document — the full distilled brand system. No field-per-color, no nested schema.

| Field | Type | Notes |
|---|---|---|
| `title` | string | Client full name |
| `slug` | slug | e.g. `heartbeat-international` |
| `abbreviations` | string | Common short forms (e.g. HBI) |
| `source_document` | string | Original brand guide filename |
| `extracted_date` | date | When the package was extracted |
| `content` | text (markdown) | Full distilled brand system — primary field Claude reads |
| `dropbox_link` | url | Link to source PDF in Dropbox (reference only) |
| `notes` | text | Extraction notes, stale data warnings, caveats |

### 2.3 MCP Tools

**Already live (Step 1):**
- `alexandria_get_brand_package(slug)` — returns full brand package content
- `alexandria_list_brand_packages()` — returns all packages with title, slug, abbreviations

**New in Step 2:**

#### `alexandria_save_brand_package`

The primary Step 2 deliverable for this content type. Closes the loop: extract → save → available to all practitioners automatically.

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `client_name` | string | Yes | Full client name |
| `slug` | string | Yes | URL-safe identifier |
| `abbreviations` | string | No | Common short forms |
| `source_document` | string | No | Original filename |
| `content` | text | Yes | Full extracted brand package in markdown |
| `dropbox_link` | url | No | Link to source PDF |
| `notes` | text | No | Caveats, stale data warnings |

**Write behavior:** Takes the structured output of `brand_package_extraction` and maps directly to Sanity fields. No curation step required — the extraction output is the input. If the practice leader wants to edit before saving, they do so in the conversation before calling the tool.

**Permission scoping:** Read access — all tiers. Write access — `practice_leader` and `admin` only.

### 2.4 First Packages to Build

| Client | Status | Action |
|---|---|---|
| Heartbeat International | Extraction complete | Call `alexandria_save_brand_package` — closes the loop |
| WIF | Not started | Pull brand guidelines from Dropbox → run extraction → save |
| 1792 | Not started | Pull brand guidelines from Dropbox → run extraction → save |

**Before running WIF and 1792 extractions:** confirm which brand guideline files exist in Dropbox and which are current. Stale or missing guides block extraction.

### 2.5 Practitioner Workflow (Complete Loop)

```
Practice leader runs brand_package_extraction in Cowork
  → Reviews output in Claude conversation
  → Calls alexandria_save_brand_package with extracted content
  → Package is live in Alexandria
  → Every future methodology for that client automatically uses the real brand system
```

---

## 3. Templates

### 3.1 What a Template Is

A repeatable production format that is content-agnostic. Not a Word doc skeleton. The format, structure, interaction model, and production system behind a deliverable type — the thing that makes output look like JDA made it, regardless of content or client.

Templates replace what used to be Word doc and PowerPoint starter files. They now include scrolling editorial HTML pages, web landing pages, digital catalogs, document style systems, and anything else JDA wants to be repeatable at scale.

**Key distinction:** Templates and methodologies are separate content types with a relationship. A methodology describes *how to produce* a deliverable. A template describes *what the deliverable looks like and how to populate it*. A methodology can reference a template. They are not the same thing and should not be collapsed.

### 3.2 Format Types

`format_type` is the primary filter dimension when a practitioner browses templates. Three HTML formats, two document formats, one email format.

| Format Type | Description | Examples |
|---|---|---|
| `editorial-html` | Scrolling, immersive, single self-contained HTML file. No CMS, no deployment infrastructure. Premium digital experience that lives as one file. | KIRU site pattern, RFP response page, Colts welcome page, case study pages |
| `slideshow-html` | Slide-by-slide navigation, keyboard/arrow controlled, paginated. | Prolific 2026 Integrated Marketing Plan |
| `web-landing-page` | Traditional page structure. Digital catalog, service pages. | Digital catalog, capability pages |
| `word-document` | .docx reference file in Dropbox + Claude production instructions. | JDA document style, campaign brief, crisis brief, proposal |
| `html-email` | Branded HTML email templates. | Welcome series, confirmation emails, newsletters |

**Note on website style guides:** These are production methodologies, not templates. They follow the methodology schema.

### 3.3 Full Template Inventory

All 20 templates JDA aspires to build. Prioritized by deliverable frequency and artifact availability.

#### HTML Templates

| # | Template | Format Type | Source | Priority |
|---|---|---|---|---|
| 1 | Editorial Narrative Site | `editorial-html` | GitHub — build from KIRU/existing artifacts | P1 |
| 2 | Slideshow Presentation | `slideshow-html` | GitHub — Prolific marketing plan | P1 |
| 3 | Digital Catalog / Landing Page | `web-landing-page` | GitHub — existing artifact | P1 |
| 4 | RFP Response Page | `editorial-html` | GitHub — existing artifact (Railway) | P1 |
| 5 | Client Case Study Page | `editorial-html` | GitHub — derive from KIRU pattern | P2 |
| 6 | Event / Growth Summit Page | `web-landing-page` | GitHub — TBD | P2 |
| 7 | Capability One-Pager | `web-landing-page` | GitHub — TBD | P2 |
| 8 | Annual Report | `editorial-html` | GitHub — TBD | P3 |
| 9 | Media Kit | `editorial-html` | GitHub — TBD | P3 |

#### Document Templates

| # | Template | Format Type | Source | Priority |
|---|---|---|---|---|
| 10 | JDA Document Style | `word-document` | Dropbox — existing .docx | P1 |
| 11 | Campaign Brief | `word-document` | Dropbox — existing | P1 |
| 12 | Client Proposal | `word-document` | Dropbox — TBD | P1 |
| 13 | Crisis Communications Brief | `word-document` | Dropbox — existing | P2 |
| 14 | Site Architecture Document | `word-document` | Dropbox — TBD | P2 |
| 15 | Press Release | `word-document` | Dropbox — TBD | P2 |
| 16 | Client Onboarding Playbook | `word-document` | Dropbox — TBD | P3 |
| 17 | Media Kit (document version) | `word-document` | Dropbox — TBD | P3 |

#### Email Templates

| # | Template | Format Type | Source | Priority |
|---|---|---|---|---|
| 18 | Welcome Series (3-email) | `html-email` | GitHub — derive from KIRU | P2 |
| 19 | Event Confirmation / Follow-Up | `html-email` | GitHub — TBD | P2 |
| 20 | Client Newsletter | `html-email` | GitHub — TBD | P3 |

**P1 = build in Step 2. P2 = Step 3–4. P3 = ongoing content expansion.**

**Note on website style guides:** These are production methodologies, not templates. They follow the methodology schema.

### 3.3 Sanity Schema

| Field | Type | Notes |
|---|---|---|
| `title` | string | Human-readable name (e.g. `Scrolling Editorial Presentation`) |
| `slug` | slug | e.g. `scrolling-editorial-presentation` |
| `format_type` | string (enum) | See format types above |
| `preview_url` | url | Live deployed example practitioners can view |
| `github_raw_url` | url | Raw GitHub URL to the base HTML file (HTML format types only) |
| `dropbox_link` | url | Link to base .docx or asset file (document format types only) |
| `production_instructions` | text (markdown) | Claude-readable: what is fixed, what is variable, how to adapt, how to inject brand system |
| `use_cases` | text | Plain language — when to use this template |
| `feature_list` | text | What the template is capable of (animations, data viz, interactive sections, etc.) |
| `practice_areas` | reference[] | Which practices this template applies to |

### 3.4 HTML Template Architecture

HTML templates use CDN Tailwind — no build step, no compilation, no Node required.

```html
<script src="https://cdn.tailwindcss.com"></script>
```

One script tag in the `<head>`. Full Tailwind utility class availability. The generated output is a single self-contained HTML file a practitioner can open in a browser, share as a link, hand to a client for review, or pass to a developer to deploy.

**Template source:** Lives in GitHub as a clean, brand-agnostic HTML file. Alexandria stores metadata about the template — what it is, what it does, how to use it — not the codebase itself. The MCP tool returns the `github_raw_url` so Claude can fetch the file as a structural starting point.

### 3.5 MCP Tools

#### `list_templates(format_type?)`

Returns browseable list with: title, slug, preview_url, use_cases, feature_list. Enough for a practitioner to pick a template without Claude explaining each in prose.

Optional `format_type` filter — practitioner says "show me presentation templates" and gets only scrolling editorial HTML templates.

#### `get_template(slug)`

Returns full template record: all schema fields including `production_instructions`, `github_raw_url` or `dropbox_link`, `feature_list`, `use_cases`.

**No write tool in Step 2.** Template records are admin-maintained (Brandon). Practice leaders do not create or modify template records. This may change in a later step once the content type is stable.

### 3.6 Practitioner Workflow

```
Practitioner: "Show me presentation templates"
  → list_templates(format_type: scrolling-editorial-html)
  → Returns: title, preview URL, use cases, feature list for each

Practitioner: "Using the Prolific marketing plan template, create a presentation
  for 1792 using this content [uploads Word doc]"
  → get_template(scrolling-editorial-presentation)
  → alexandria_get_brand_package(1792)
  → Claude fetches raw HTML from github_raw_url
  → Claude generates content per production_instructions, injecting 1792 brand system
  → Output: complete self-contained HTML artifact in the conversation
  → Practitioner previews, iterates conversationally, downloads when satisfied
```

**No auto-deployment.** The output is an HTML artifact — not hosted, not auto-published. If it needs to go live, a developer takes the finished file. The value is removing the blank page and the brand archaeology, not removing the developer from the deployment decision.

### 3.7 First Templates to Build

| Template | Format Type | Source | Preview URL |
|---|---|---|---|
| Scrolling Editorial Presentation | `scrolling-editorial-html` | GitHub | https://jdaworldwide.com/pro-marketing-plan/index.html |
| Web Landing Page / Catalog | `web-landing-page` | GitHub | https://jdaworldwide.com/digital-catalog.html |
| JDA Document Style | `word-document` | Dropbox | — |

Additional candidates (load after initial three are validated):
- Colts welcome page (`scrolling-editorial-html`)
- RFP response page (`scrolling-editorial-html` — already in Railway, needs GitHub source)

---

## 4. `assemble_production_context` Update

Step 2 is the first time the MCP server chains multiple content types together. The orchestrated tool must be updated to include brand package resolution.

**Updated chain:**
```
assemble_production_context(deliverable_type, client?)
  → get_template(deliverable_type)
  → get_prompt_chain(deliverable_type)         [Step 1]
  → get_client_brand_package(client)           [Step 2 — new]
  → get_quality_gate(deliverable_type)         [Step 3]
  → Returns: assembled context in one call
```

**Validate payload sizes** after brand packages are loaded — brand packages are the richest content type so far (HBI is ~5,000 words). Test `assemble_production_context` with a full brand package in the chain against the 1M context window.

---

## 5. Build Sequence

### Phase A: `alexandria_save_brand_package` write tool

1. Add write endpoint to MCP server (mirror `add_prompt_library_entry` pattern from Step 1)
2. Validate permission gate — practice_leader and admin only
3. Test: call from Claude with HBI extraction output → confirm record appears in Sanity
4. Run extraction + save for WIF and 1792 (after Dropbox file audit)

### Phase B: Template Sanity schema

1. Add `template` content type to Sanity schema
2. Load first three template records manually via Sanity Studio
3. Confirm schema fields match discovery decisions above

### Phase C: Template MCP tools

1. Implement `list_templates(format_type?)` — returns browseable metadata, not full records
2. Implement `get_template(slug)` — returns full record including `production_instructions` and source URL
3. Test end-to-end: practitioner asks for presentation templates → gets list → selects one → Claude fetches raw HTML from GitHub → generates populated artifact

### Phase D: `assemble_production_context` update

1. Add brand package resolution step to the orchestrated tool
2. Test with a real deliverable: template + prompt chain + brand package → full production context
3. Measure payload size, confirm no context window issues

---

## 6. Known Gaps Carried Forward

| Gap | Notes |
|---|---|
| Dropbox file audit for WIF and 1792 | Required before brand package extractions can run |
| GitHub repos for HTML templates | Scrolling editorial and web landing page templates need clean brand-agnostic source files committed to GitHub |
| Permission gating not validated with practitioner account | Carried from Step 1 — validate before team rollout |
| Azure AD security groups not enforced | Carried from Step 1 — acceptable for admin-only access period |

---

*Supersedes prior Step 2 notes. Next document: Step 3 — Deliverable Classifications + Quality Gates + Capabilities Matrix.*
