# JDA AI-Native Platform — Implementation Plan

> Updated March 30, 2026 to reflect Steps 2–3 completion.

---

## Architecture Overview

The platform is a structured content and knowledge layer that makes Claude operationally intelligent for JDA (and eventually for external organizations). It consists of four components:

**The Portal** — A web app (Azure AD gated, restricted to a small admin group) that manages all platform content: templates, prompt libraries, workflow guides, client brand packages, capabilities matrix, deliverable classification, quality gate definitions. Also houses LOB tools (RFP scraper, proposal generator, etc.) and practice leader dashboards. Most JDA practitioners never touch the portal. It is the management layer, not the practitioner experience.

**The Bridge** — An MCP server exposing the portal's content API so Claude can query it live. Practitioners interact with the platform entirely through Claude via this MCP connection. The MCP server is connected at the Claude Teams organization level; each practitioner authenticates individually via OAuth (Azure AD). Permission tiers control what each user can read or write. This pattern is proven — Flint validates the MCP server architecture, and the Dropbox/Asana connectors validate the OAuth-per-user flow on Claude Teams.

**The Automation Layer** — n8n as the nervous system connecting the portal to Asana, Fireflies, Slack, and other operational tools. Handles background workflows (transcript routing, dashboard data, notifications) and powers LOB tool backends.

**The Claude Environment** — Claude Projects scoped per practice area and/or per client, with MCP providing live platform content on demand. The practitioner works in Claude. The platform ensures Claude has the right knowledge for the practitioner's role, practice, and client context.

### MCP Connector Reauth Note

Practitioners connecting Alexandria through Claude Teams must disconnect and reconnect the connector whenever **new MCP tools are added** (Claude re-fetches the tool manifest on reconnect). This is a Claude protocol constraint — not something the platform can eliminate. Content changes (Sanity edits, brand package updates, `platformGuide` text) are live immediately and never require reauth. A practitioner-facing changelog should communicate when a reconnect is needed. See Step 10 for changelog as portal content.

### Key Architecture Principle

The portal is NOT where practitioners go to do their work. Claude is. The portal is the management layer where content is created, organized, and published into Claude's ecosystem. The practitioner experience is: open Claude, and Claude already knows how JDA works — because the platform fed it the context.

LOB tools (RFP scraper, proposal generator, meeting intelligence) are the exception — these are standalone applications that live in the portal because they do things Claude can't do natively.

---

## Verified Tech Stack

| Layer | Technology | Status | Notes |
|---|---|---|---|
| Framework | Next.js (App Router) | **Verified** | Server components, API routes, middleware |
| Language | TypeScript | **Verified** | Strict mode throughout |
| Styling | Tailwind CSS | **Verified** | Custom CSS variables for theming |
| Auth (portal) | Auth.js v5 + Microsoft Entra ID | **Verified** | Azure AD SSO, single-tenant, Object ID as stable user identifier |
| Auth (MCP) | OAuth via Claude Teams connector | **Verified** | Org-level connector setup, per-user OAuth authorization via Azure AD |
| Database | PostgreSQL on Railway | **Verified** | Direct SQL via `postgres` npm package, no ORM |
| Content store | Sanity (self-hosted on Railway) | **Verified** | CMS-shaped content. Sanity Studio provides admin UI. GROQ API serves both portal frontend and MCP server. |
| MCP server | Standalone Node.js service | **Verified** | `@modelcontextprotocol/sdk`, Streamable HTTP transport |
| Hosting | Railway (all services) | **Verified** | Single Railway project, multiple services, shared PostgreSQL. Auto-deploy on push to `main`. |
| Source control | GitHub | **Verified** | CI/CD via Railway auto-deploy |
| Automation | n8n on Railway | Planned | Same Railway project |
| File storage | None (platform stores text; logos stored in Sanity; files live in Dropbox) | **Resolved** | See Storage Architecture below |

---

## Authentication Architecture

### Two Auth Contexts

| Context | Who | How | What It Does |
|---|---|---|---|
| Portal sign-in | Small admin group (Brandon, practice leaders, NewCo team) | Auth.js v5 + Entra ID, direct browser session | Full portal access — content management, dashboards, settings |
| MCP via Claude | All JDA practitioners (~33 people) | OAuth via Claude Teams custom connector, Azure AD | Access platform content through Claude, scoped by permission tier |

### Permission Tiers

| Tier | Portal Access | MCP Read | MCP Write | Examples |
|---|---|---|---|---|
| Practitioner | None (no portal sign-in) | Practice-scoped content | None | Hannah, Derek, Zeke |
| Practice Leader | Content management for their practice + dashboards | Full practice content | Push deliverable classifications, workflow updates | Christina, Kristi |
| Admin (NewCo) | Everything | Full platform content | All content types | Brandon |

### API Keys (Secondary Auth)

Retained for programmatic access (n8n automations), Claude Code integration, and fallback. Not the practitioner path.

---

## Storage Architecture

The platform stores authored intelligence as text in Sanity. Logos are stored directly in Sanity (SVG code or hosted image). Raw asset files live in Dropbox.

| Content | Where It Lives | How the Portal References It |
|---|---|---|
| Template production instructions | Sanity (authored text) | MCP returns instructions as text |
| Client brand voice, tone, messaging | Sanity (authored text) | MCP returns distilled brand context |
| Client logos | Sanity (SVG code field or hosted image field) | MCP returns SVG markup or CDN URL |
| Brand guidelines PDFs | Dropbox (existing) | Sanity stores Dropbox link |
| Workflow guides | Sanity (authored text) | MCP returns workflow steps |
| Deliverable classifications, quality gates, capabilities matrix | Sanity (structured data) | MCP returns structured lookups |
| LOB tool output | Railway disk (ephemeral) → Dropbox (permanent via n8n) | LOB tools generate to Railway, n8n routes to Dropbox |

---

## Build Sequence

### Step 1: Portal Foundation + Proof of Concept — ✅ COMPLETE

**Portal foundation:**
- ✅ Next.js app on Railway with Auth.js v5 + Entra ID
- ✅ Azure AD security groups (Admins, Editors, Users) — group membership is source of truth for permission tiers, enforced on every login
- ✅ PostgreSQL schema for users, api_keys, oauth_sessions
- ✅ Sanity self-hosted on Railway with initial schema
- ✅ Portal navigation shell (Dashboard, Content, Clients, Users, Tools, Settings)
- ✅ Sanity Studio as the admin interface
- ✅ Auth middleware protecting all portal routes
- ✅ Users management page — view all connected users, change tier, set practice

**MCP server:**
- ✅ OAuth via Claude Teams custom connector (PKCE flow, our server acts as auth server)
- ✅ Azure AD group membership checked on every OAuth login
- ✅ Session tokens in PostgreSQL, 90-day expiry
- ✅ API key fallback for programmatic access
- ✅ Permission gating — `systemInstructions`, `visionOfGood`, `tips`, `checkPrompt` restricted to `practice_leader` and `admin`
- ✅ Permission gating validated end-to-end with a real practitioner account

**Content type: Production Methodologies:**
- ✅ Sanity schema with structured fields (steps, qualityChecks, failureModes, systemInstructions, tips, visionOfGood)
- ✅ 4 methodologies seeded: pre-discovery brief, post-discovery brief, client strategy brief, brand package extraction
- ✅ `alexandria_list_methodologies`, `alexandria_get_methodology`, `alexandria_list_practice_areas`, `alexandria_list_deliverables`, `alexandria_whoami`

**Content type: Client Brand Packages:**
- ✅ Sanity schema with structured fields + `rawMarkdown` primary field
- ✅ `logoSvg` and `logoImage` fields added — SVG code preferred, raster image as fallback
- ✅ `alexandria_list_brand_packages`, `alexandria_get_brand_package`, `alexandria_save_brand_package`
- ✅ 11 brand packages loaded: HBI, Biglife, CHM, Conquer, Indy Chamber, Indy Partnership, Kingsworth, Prolific, Spokenote, Venture, WIF

**Validated end-to-end:** HBI post-discovery brief produced on-brand output using real HBI colors and voice pulled from Alexandria.

---

### Step 2: Templates — ⚠ PARTIALLY COMPLETE — Template system needs additional work before production-ready

**Architecture decision:** All HTML deliverable types (scrolling editorial, slideshow, landing page, catalog, RFP response) consolidated into a single `html-deliverable` template with a feature menu (scroll / slide / tabbed layout modes). One template to maintain, infinite combinations. Claude selects the right combination from the practitioner's description — no command words required.

**Status note:** Schema, MCP tools, and intake enforcement are complete. However, end-to-end testing revealed the template system is not yet production-ready — Claude generates HTML structure from scratch rather than from a canonical source, producing inconsistent output. Brand font extraction is unreliable. Brand-specific overrides don't exist yet. These gaps need to be closed before Step 2 is truly complete.

**Template schema + MCP tools:**
- ✅ Sanity schema with six structured production instruction fields (fixedElements, variableElements, brandInjectionRules, clientAdaptationNotes, outputSpec, qualityChecks)
- ✅ `alexandria_list_templates` — list active templates, filter by format type
- ✅ `alexandria_get_template` — full template with production instructions

**Templates loaded:**
- ✅ HTML Deliverable (`html-deliverable`) — covers all HTML formats, active
- ✅ JDA Document Style (`jda-document-style`) — word document, programmatic .docx generation via `docx` npm library, active
- ⬜ Campaign Brief — pending discovery session
- ⬜ Client Proposal — pending discovery session

**Format types (simplified from original plan):**
- `html-deliverable` — all HTML formats
- `word-document` — .docx generation
- `html-email` — branded email templates

**Brand extraction methodology updated:**
- ✅ Website scrape fallback added — when no brand guidelines PDF exists, Claude scrapes homepage, about, services pages and extracts what's available. Gaps documented explicitly. JDA itself can be extracted this way.

**Sanity Studio improvements:**
- ✅ Download as Markdown action — available on all document types, assembles a clean markdown file for pasting into Claude. Smart field handling: SVG inline, nested objects, arrays, enum labels.

**Remaining open items from Step 2:**
- ✅ **Intake enforcement — session-gated flow.** `intake_sessions` table in Postgres, `alexandria_get_template` returns session_id + questions only, `alexandria_submit_intake` validates and completes sessions, `alexandria_build_template` hard-rejects incomplete sessions. Built and deployed.
- ✅ **Canonical entry prompt convention.** Established: *"I need to build an HTML deliverable from Alexandria."* Documented in intake instructions and to be included in `alexandria_help`.
- ✅ **Brand-specific template overrides.** `templateOverrides` text field added to brand package schema and included in MCP response (surfaced first, before brand content).
- ✅ **Web font injection.** `webFonts[]` array added to brand package schema — role, family name, source, ready-to-inject `<link>` tag, CSS stack, web substitute. MCP returns link tags and CSS values ready to paste. Font CDN resolution (Google → Typekit → substitute) to be part of brand extraction methodology.
- ✅ **Logo variants.** `logos[]` array added — multiple variants (primary, reversed, icon, wordmark, etc.) each with onBackground, svgCode, raster fallback, and notes. `logoUsageRules` field tells Claude which variant to use where.
- ⬜ **Canonical HTML source in GitHub (P0).** The `fixedElements` field describes the template in prose — Claude generates CSS architecture and slide engine JS from scratch every time, producing inconsistent and sometimes broken output (backward nav bug in slide mode confirmed). The `githubRawUrl` field exists for a canonical, version-controlled HTML file. Slide engine, CSS custom properties, and component scaffolding must live in the repo and be proven correct before any deliverable uses them.
- ⬜ **Re-extract all existing brand packages (P1).** `logos[]`, `webFonts[]`, `logoUsageRules`, and `templateOverrides` are unpopulated on all 11 existing packages. Re-run through updated extraction methodology with font CDN resolution. Priority: Prolific first, then remaining 10.
- ⬜ `alexandria_save_template` write tool — not yet built. Templates currently loaded via script or Sanity Studio.
- ⬜ Campaign Brief + Client Proposal templates — pending discovery.
- ⬜ `assemble_production_context` — deferred, not needed to validate Step 2.

---

### Step 3: Alexandria Help + Platform Discovery Surface — ✅ COMPLETE

**Spec:** `ref/step-3-alexandria-help-spec.md` — developed in discovery session March 30, 2026.

**What this solves:**
Two failure modes. **Bypass failure** — practitioner builds without Alexandria, output is unsanctioned. **False sanction failure** — practitioner asks Alexandria for something it doesn't have, Claude invents a methodology, practitioner believes it came through an approved channel. `alexandria_help` addresses both: it is simultaneously a discovery surface (what exists) and a coaching tool (how to use it correctly).

**Response style:** Style A (structured inventory) + Style D (intent-driven follow-ups) combined. Structured summary comes first — scannable, scales as content grows. Intent prompts follow as natural next steps.

**MCP tool: `alexandria_help`**

Response structure (in order):
1. What Alexandria is — one or two sentences, authored in Sanity (`platformIntro` field), not hardcoded
2. How to start a production job — canonical entry prompt as first-class instruction: *"I need to build a [deliverable type] from Alexandria."* No client, no content, no layout in the opening prompt.
3. Active methodologies — name, practice area, one-line when-to-use. Listed before templates (methodologies = majority of eventual production volume)
4. Active templates — name, format type, use cases
5. Available brand packages — full client name list
6. Permission-tier addendum — practice_leader and admin only, appended after standard response. Surfaces elevated capabilities (full methodology content, write tools)
7. Intent-driven follow-ups (Style D) — 4 suggested next steps as sendable prompts reflecting what practitioners actually do next

**Trigger:** Intentional only in v1 — fires when practitioner explicitly asks what Alexandria can do. Proactive triggering (Claude detecting unsupported production requests) is deferred — Claude already knows its connected tools and doesn't need a tool call to check its own capabilities. Convention instead: practitioners learn to ask "Can Alexandria do ___?" before asking to produce something Alexandria doesn't have.

**Unsupported request flow:**
> "Alexandria doesn't currently have a methodology or template for this. I'm happy to help — and we should still use what Alexandria does have, including your brand package and quality frameworks, even if the deliverable itself isn't from a sanctioned template. Want me to proceed?"
Not a refusal. Transparent handoff that keeps Alexandria assets in the loop. Every unsupported request logged.

**Sanity schema: `platformGuide` singleton**
- `platformIntro` — one or two sentence description of Alexandria. Authored in Sanity, not hardcoded.
- `canonicalEntryPrompts` — array of entry prompt strings
- `examplePrompts` — array of example prompts for common use cases, all following generic entry pattern. Maintained in Sanity by Brandon/practice leaders.

**Request logging: `alexandria_request_log` table**
Applied to ALL MCP tool calls, not just `alexandria_help`. Columns: `user_id`, `permission_tier`, `tool_name`, `request_summary`, `matched_capability` (bool), `capability_type` (template/methodology/brand_package/null), `capability_id`, `created_at`. Unsupported requests (`matched_capability = false`) are the priority data — primary input for deciding what to build next. Reporting surface deferred to Step 6 dashboards.

**Build items:**
- ✅ `alexandria_request_log` DB migration
- ✅ Request logging middleware on all MCP tool handlers (get_template, build_template, get_methodology, get_brand_package, help)
- ✅ `platformGuide` Sanity schema (singleton document type)
- ✅ Seed `platformGuide` document (platformIntro, canonicalEntryPrompts, examplePrompts)
- ✅ `alexandria_help` MCP tool — tier-aware, pulls live from Sanity, tier callout as blockquote at top
- ✅ Unsupported request flow — baked into tool description; validated with "social media calendar" test

**Validated:** `alexandria_help` returns structured inventory with tier callout, unsupported request handoff fires correctly, request logging confirmed in Postgres.

**Depends on:** Step 2 intake enforcement complete. `platformGuide` content seeded before `alexandria_help` goes live.

---

### Step 4: Deliverable Classifications + Quality Gates + Capabilities Matrix

Add the structured reference data content types. Needs a discovery session before building.

**Questions to resolve in discovery:**
- What fields matter? What does the MCP server return?
- How do practice leaders maintain these? (Portal, Claude write-back, or both?)
- How do these integrate with the production context assembly chain?
- Are these worth building before the Claude Project architecture is defined? They're most useful when assembled into a production context — but if `assemble_production_context` is deferred, these might be premature.

**Depends on:** Step 2 complete.

---

### Step 5: Workflow Guides + Practice Areas + Roles

Add the remaining content types that complete the knowledge model. Needs practice leader alignment meetings before content can be authored.

**Questions to resolve in discovery:**
- What does a workflow guide look like for each practice?
- How are practice areas and roles structured?
- What does the MCP server return?
- Is this content more useful in Claude Project system prompts than in MCP lookups?

**Depends on:** Steps 2–4. Practice leader alignment meetings and discovery interviews.

---

### Step 6: Dashboards and Measurement Layer

Wire up adoption tracking and practice leader views.

**Build:**
- MCP usage tracking (who's querying, how often, which content types, which practices)
- Practice leader dashboard views in the portal
- Asana API integration for adoption tracking
- n8n workflows for background data routing (Fireflies transcripts, etc.)

**Open questions:**
- What metrics actually matter to practice leaders? This needs to be defined before building dashboards.
- Is Asana the right adoption proxy, or is MCP usage data sufficient?
- n8n hasn't been touched — what does the first workflow actually look like?

**Depends on:** Defining what metrics matter. MCP usage data is available from Step 1 onward.

---

### Step 7: Claude Project Architecture — NEEDS FULL REVISIT

This step was written before MCP was proven and before the platform had real content. The assumptions have changed significantly.

**What the original plan assumed:**
- Significant uncertainty about how Projects + MCP work together
- A complex setup process requiring a wizard
- Content needing to live in Project system prompts

**What's actually true now:**
- MCP is proven. Projects + MCP works. The real question is content strategy, not technical feasibility.
- The platform has real content. The question is what belongs in a Project system prompt vs. what gets pulled live via MCP.
- Practitioner onboarding might be much simpler than anticipated.

**Questions to resolve in discovery:**
- What is the right Project structure — per-practice, per-client, or both?
- What content belongs in a Project system prompt vs. MCP on-demand?
- What does a practitioner's day-one experience look like?
- How do Projects get updated when platform content changes?
- Who manages Projects — Brandon, practice leaders, or self-serve?
- Does a "Setup Wizard" still make sense, or is Project setup simple enough to do manually?

**Depends on:** Having enough content in Alexandria to actually test with. Steps 1–3 are sufficient to start this discovery.

---

### Step 8: LOB Tools

Build the first standalone tool modules in the portal.

**Priority candidates:**
- RFP scraper/finder (was "in progress" — current status unknown)
- Proposal generator
- Meeting intelligence pipeline (Fireflies → structured summaries)
- Client onboarding playbook builder

**Open questions:**
- Where does the RFP scraper actually stand?
- Which tool has the highest immediate value to practitioners?
- Do LOB tools need n8n, or can some be built as simple Claude API calls in the portal?
- What's the file routing story — is n8n to Dropbox still the right path?

**Depends on:** Specific tool requirements from practice activations. n8n setup for file routing tools.

---

### Step 9: Claude Project Setup Wizard — LIKELY OBSOLETE OR MUCH SMALLER

Originally designed to generate everything needed to stand up a new Claude Project. May be unnecessary if Project setup is simple, or may be repurposed as a content package generator (assembles the right Alexandria content into a format ready to paste into a Project system prompt).

**Depends on:** Outcomes of Step 7 discovery.

---

### Step 10: Content Expansion from Discovery

Ongoing — as practice leader discoveries happen, new content flows into Sanity through the portal or through Claude (practice leader write-back via MCP).

**Changelog as portal content (not urgent):** When new MCP tools are added, practitioners need to know to reconnect their Alexandria connector in Claude. A lightweight changelog — authored in Sanity, surfaced as a page in the portal and optionally via `alexandria_help` — would communicate this without requiring a Slack message from Brandon. Add a `changelogEntry` array to `platformGuide` (date, summary, requires_reauth bool) and surface it in the portal. Low priority, but the right home for it.

**No end date. Depends on:** Practice leader alignment meetings and discovery interviews.

---

### Step 11: Initial Launch

The platform is live with real content across all content types. MCP bridge working with OAuth. At least one or two LOB tools functional. A practitioner can sit in Claude and operate AI-native using platform-managed content.

---

## Security Model & Known Gaps

### Layers of Protection (as built)

| Layer | What it does | Status |
|---|---|---|
| Azure AD tenant restriction | Only accounts in the JDA tenant can authenticate at all | Live |
| Portal auth middleware | Every portal route and API endpoint requires an active Azure AD session | Live |
| Portal admin-only API routes | `/api/users` requires `tier = admin` in the database | Live |
| Self-tier-change blocked | An admin cannot demote their own tier via the Users API | Live |
| MCP OAuth session tokens | Every MCP request requires a valid bearer token | Live |
| MCP permission gating | `systemInstructions`, `visionOfGood`, `tips`, `checkPrompt` blocked for `practitioner` tier | Live |
| MCP API key fallback | Secondary auth for programmatic access | Live |

### Known Gaps

1. **MCP pending flow state is in-memory** — a server restart during OAuth drops the flow. Low risk on single-replica Railway. Long-term: move to PostgreSQL.
2. **No MCP request rate limiting** — should be added before public rollout.

### Security Testing Checklist (Before Team Rollout)

- [ ] Confirm a JDA account not in any security group cannot sign into the portal (rejected at Azure AD)
- [ ] Confirm a JDA account not in any security group cannot complete MCP OAuth
- [ ] Demote a test user to `practitioner`, confirm system instructions are blocked in Claude
- [ ] Confirm unauthenticated requests to `/api/users` return 401
- [ ] Confirm a `practitioner`-tier portal session cannot access `/api/users`
- [ ] Confirm MCP requests with an expired/invalid token return 401
- [ ] Confirm MCP requests with a valid practitioner token cannot read gated methodology fields
- [ ] Confirm an admin cannot change their own tier via the Users API

---

## Open Discovery Questions — For Next Session in Claude

The following questions need to be worked through before committing to the build sequence for Steps 3–8. These should be the basis of a discovery session.

### Claude Project Architecture (Step 7 — highest priority to resolve)

The original plan deferred this to Step 6, but the decisions here affect everything before it. What's in a Project system prompt determines what MCP needs to return and how. This needs to be resolved early, not late.

- What is the right Project structure? Options:
  - One Project per practice area (Brand, Digital, PR, etc.)
  - One Project per client (HBI, Prolific, Conquer, etc.)
  - Both — practice Projects for methodology, client Projects for deliverables
  - One universal Project that uses MCP to scope everything dynamically
- What belongs in a Project system prompt vs. pulled live via MCP?
  - System prompt candidates: JDA identity, practitioner role context, practice area overview, standing operating procedures
  - MCP candidates: client brand packages, specific templates, methodology instructions, quality gates
  - The answer affects how much content needs to be in Sanity vs. in Project instructions
- How does a practitioner get set up? Is there a self-serve process or does Brandon configure each one?
- How do Projects stay current when Alexandria content changes? MCP solves this for live lookups — but system prompt content goes stale.
- Is there a meaningful difference between a "practice Project" and a "client Project" or does MCP make that distinction irrelevant?

### Alexandria Help + Discovery Surface (Step 3)

Scope validated by `ref/alexandria-intake-enforcement.md` — use that as the starting point for the discovery session. Discovery session required before building.

### Deliverable Classifications + Quality Gates (Step 4)

- Are these worth building as dedicated Sanity content types, or are they better as structured sections within methodologies?
- Who actually uses quality gates — Claude enforcing them automatically, or practitioners checking manually?
- What's the minimum viable version? A simple list of deliverable types with AI classification might be enough to start.

### Workflow Guides (Step 5)

- How different are workflow guides across practices? If they're very similar, one schema fits all. If they're practice-specific, they might belong in Project system prompts rather than MCP.
- Who authors these — Brandon, practice leaders, or both?
- What does a practitioner actually do with a workflow guide in Claude? Does Claude walk them through it step by step, or is it reference material?

### LOB Tools (Step 8)

- Where does the RFP scraper stand — is it a real thing or still conceptual?
- Which tool would practitioners actually use today if it existed?
- Do LOB tools need to live in the portal or could they be standalone Claude Projects with the right MCP tools?

### Measurement (Step 6)

- What does "adoption" mean concretely? Is it MCP call volume, deliverable count, something else?
- Who looks at dashboards — Brandon, practice leaders, or both?
- What's the minimum dashboard that would actually change behavior vs. be a vanity metric?

### `alexandria_save_template` Write Tool

- Should practice leaders be able to create and update templates through Claude, or is that an admin-only action?
- If yes, what's the review/approval process before a new template is active?

---

*Updated March 30, 2026. Steps 1–3 complete. Steps 4–11 pending discovery sessions outlined above.*
