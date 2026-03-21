# JDA AI-Native Platform — Implementation Plan

> Updated to reflect the Flint proof of concept and subsequent architecture decisions. Flint is a production MCP-connected app built on the same stack, deployed to Railway, and actively used through Claude. Where the original build plan carried assumptions, this document replaces them with what's been verified.

---

## Architecture Overview

The platform is a structured content and knowledge layer that makes Claude operationally intelligent for JDA (and eventually for external organizations). It consists of four components:

**The Portal** — A web app (Azure AD gated, restricted to a small admin group) that manages all platform content: templates, prompt libraries, workflow guides, client brand packages, capabilities matrix, deliverable classification, quality gate definitions. Also houses LOB tools (RFP scraper, proposal generator, etc.) and practice leader dashboards. Most JDA practitioners never touch the portal. It is the management layer, not the practitioner experience.

**The Bridge** — An MCP server exposing the portal's content API so Claude can query it live. Practitioners interact with the platform entirely through Claude via this MCP connection. The MCP server is connected at the Claude Teams organization level; each practitioner authenticates individually via OAuth (Azure AD). Permission tiers control what each user can read or write. This pattern is proven — Flint validates the MCP server architecture, and the Dropbox/Asana connectors validate the OAuth-per-user flow on Claude Teams.

**The Automation Layer** — n8n as the nervous system connecting the portal to Asana, Fireflies, Slack, and other operational tools. Handles background workflows (transcript routing, dashboard data, notifications) and powers LOB tool backends.

**The Claude Environment** — Properly structured Claude Projects per practice area and per client, loaded with platform content. The practitioner works in Claude. The platform ensures Claude has the right knowledge for the practitioner's role, practice, and client context.

### Key Architecture Principle

The portal is NOT where practitioners go to do their work. Claude is. The portal is the management layer where content is created, organized, and published into Claude's ecosystem. The practitioner experience is: open Claude, and Claude already knows how JDA works — because the platform fed it the context.

LOB tools (RFP scraper, proposal generator, meeting intelligence) are the exception — these are standalone applications that live in the portal because they do things Claude can't do natively.

---

## Verified Tech Stack

Flint validates the full deployment architecture. The portal builds on the same foundation with one addition (Sanity) for structured content management.

| Layer | Technology | Status | Notes |
|---|---|---|---|
| Framework | Next.js (App Router) | **Verified in Flint** | Server components, API routes, middleware |
| Language | TypeScript | **Verified in Flint** | Strict mode throughout |
| Styling | Tailwind CSS | **Verified in Flint** | Custom CSS variables for theming |
| Auth (portal) | Auth.js v5 + Microsoft Entra ID | **Verified in Flint** | Azure AD SSO, single-tenant, Object ID as stable user identifier |
| Auth (MCP) | OAuth via Claude Teams connector | **Verified via Dropbox/Asana pattern** | Org-level connector setup, per-user OAuth authorization via Azure AD |
| Database | PostgreSQL on Railway | **Verified in Flint** | Direct SQL via `postgres` npm package, no ORM |
| Content store | Sanity (self-hosted on Railway) | **New for portal** | CMS-shaped content (templates, prompts, workflow guides, client packages). Sanity Studio provides admin UI. GROQ API serves both portal frontend and MCP server. |
| MCP server | Standalone Node.js service | **Verified in Flint** | `@modelcontextprotocol/sdk`, Streamable HTTP transport |
| Hosting | Railway (all services) | **Verified in Flint** | Single Railway project, multiple services, shared PostgreSQL. Auto-deploy on push to `main`. |
| Source control | GitHub | **Verified in Flint** | CI/CD via Railway auto-deploy |
| Automation | n8n on Railway | Planned | Same Railway project |
| File storage | None (platform stores text; files live in Dropbox) | **Resolved** | See Storage Architecture below |

### What Changed from the Original Plan

**Vercel removed.** The original plan split hosting between Vercel (portal frontend, serverless API routes) and Railway (Sanity, Supabase, n8n, MCP server). Flint runs the full Next.js app on Railway with no issues. One hosting provider, one deployment target, one set of environment variables.

**Supabase removed.** The original plan used Supabase on Railway for portal auth and internal permission assignments. Flint proves that Auth.js v5 handles authentication directly against Azure AD, and PostgreSQL on Railway handles all relational data (users, permissions, application state) without needing Supabase as an intermediary. Supabase also offered file storage, but the storage architecture (below) eliminates that need.

**MCP auth model changed.** The original plan used Flint's pattern: manually generated API keys, pasted into Claude.ai's integration URL. The updated plan uses the Claude Teams custom connector pattern (same as Dropbox, Asana, etc.): the admin adds the connector at the org level with OAuth credentials, and each practitioner authenticates individually via Azure AD. No API keys to generate, distribute, or manage for end users.

**MCP is proven, not speculative.** The original plan treated MCP as Step 2 with significant uncertainty. Flint has a working MCP server deployed on Railway, connected to Claude.ai. The OAuth connector flow is validated by existing Dropbox and Asana integrations on the Teams account. The remaining uncertainty is content payload sizes against the 1M context window.

**Storage resolved.** The platform stores authored intelligence as text in Sanity. Raw asset files (brand guidelines PDFs, logos, template files) stay in Dropbox. The portal links to them. No dedicated file storage layer needed. See Storage Architecture below.

**Nuclear option reframed.** With MCP proven, the self-contained API-wrapper app is no longer a fallback — it's a separate architectural choice for Product Line 4 (white-labeled production studio for outside agencies), where controlling the full practitioner experience matters more than leveraging Claude's native interface.

---

## Authentication Architecture

### Two Auth Contexts

The platform has two distinct authentication contexts:

| Context | Who | How | What It Does |
|---|---|---|---|
| Portal sign-in | Small admin group (Brandon, practice leaders, NewCo team) | Auth.js v5 + Entra ID, direct browser session | Full portal access — content management, dashboards, settings |
| MCP via Claude | All JDA practitioners (~33 people) | OAuth via Claude Teams custom connector, Azure AD | Access platform content through Claude, scoped by permission tier |

### Portal Access Control

The portal is restricted to a small group. Two layers of access control:

1. **Azure AD security group** — A group (e.g., "JDA AI Platform Admins") in Entra ID controls who can sign into the portal at all. Brandon manages this group directly in Azure admin. If you're not in the group, Azure AD rejects the sign-in.
2. **Permission tiers in PostgreSQL** — Once authenticated, the portal checks the user's tier and scopes their experience. During initial build, only Admin tier exists (Brandon). Practice leader access is added during activation.

### MCP Access Control

The MCP server is added as a custom connector at the Claude Teams organization level:

1. **Admin (Brandon) adds the connector** — Organization Settings → Connectors → Add custom connector. Provides the MCP server URL and Azure AD OAuth Client ID / Client Secret.
2. **Each practitioner connects individually** — Settings → Connectors → finds the portal connector → clicks "Connect" → authenticates via Azure AD. Each user's OAuth token is scoped to their identity.
3. **Azure AD security group gates authorization** — The portal's Azure AD app registration is scoped to a security group (e.g., "JDA AI Platform Users" — a broader group than the portal admin group). Only JDA staff in this group can complete the OAuth flow.
4. **MCP server resolves identity and permissions** — On each request, the MCP server validates the OAuth token, resolves the user's Azure AD Object ID, looks up their permission tier in PostgreSQL, and scopes the response.

### Permission Tiers

| Tier | Portal Access | MCP Read | MCP Write | Examples |
|---|---|---|---|---|
| Practitioner | None (no portal sign-in) | Practice-scoped content | None | Hannah, Derek, Zeke |
| Practice Leader | Content management for their practice + dashboards | Full practice content | Push deliverable classifications, workflow updates | Christina, Kristi |
| Admin (NewCo) | Everything | Full platform content | All content types | Brandon |

Practice leaders can push content updates through Claude without ever touching the portal. A practice leader says to Claude: "Add a new deliverable classification for social media carousel — AI-Led, uses the Brand Social template." The MCP server validates their write permission and creates the record in Sanity. This keeps the platform alive without requiring everyone to learn the portal admin interface.

### API Keys (Secondary Auth — Retained from Flint)

The Flint-style API key pattern is retained as a secondary auth method for:
- Programmatic access (n8n automations calling the MCP server)
- Claude Code integration (for development and testing)
- Fallback if OAuth flow has issues

API keys are admin-generated in the portal settings. They are not the primary auth path for practitioners.

---

## Storage Architecture

### Principle: Store Intelligence, Reference Files

The platform's value is in distilled, Claude-readable instructions — not raw asset files. The portal stores authored text content in Sanity. Files stay where they already live.

| Content | Where It Lives | How the Portal References It |
|---|---|---|
| Template production instructions | Sanity (authored text) | MCP returns instructions as text |
| Prompt patterns | Sanity (authored text) | MCP returns prompt text |
| Client brand voice, tone, messaging | Sanity (authored text) | MCP returns distilled brand context |
| Brand guidelines PDFs, logos | Dropbox (existing) | Sanity stores Dropbox link |
| Template reference files (Word docs, HTML) | Dropbox (existing) | Sanity stores Dropbox link |
| Workflow guides | Sanity (authored text) | MCP returns workflow steps |
| Deliverable classifications, quality gates, capabilities matrix | Sanity (structured data) | MCP returns structured lookups |
| LOB tool output (generated proposals, scraped RFPs) | Railway disk (ephemeral) → Dropbox (permanent via n8n) | LOB tools generate to Railway, n8n routes to Dropbox |

### Why This Works

This mirrors the pattern already in use. The JDA doc style guide isn't a file attachment in Claude's memory — it's distilled text instructions that tell Claude how to build documents. The portal formalizes and structures that pattern across all content types.

Claude doesn't need a brand standards PDF to write in a client's voice. Claude needs the distilled instructions about how to write in that voice. The PDF is a reference artifact for humans. When a practitioner actually needs a file, they already have Dropbox connected as a separate MCP connector.

### Infrastructure Capacity

- **Railway Pro plan:** 100GB shared disk across all services. More than sufficient for Sanity data, PostgreSQL, ephemeral LOB tool files.
- **Dropbox:** Already in use for document storage across the agency. Brand assets, templates, and reference files already live here.
- **Sanity asset storage:** Sanity self-hosted can store files and images natively, but given that Dropbox is already the agency's file home, using Sanity for file storage is unnecessary complexity. Text content in Sanity, file links to Dropbox.

---

## Separation of Concerns

| Component | Owns | Examples |
|---|---|---|
| Sanity | CMS content — authored, versioned, published intelligence | Templates, prompt library entries, client brand packages, workflow guides, deliverable classifications, quality gate definitions, capabilities matrix entries |
| PostgreSQL | Application state — relational data, permissions, metrics | User records (Object ID, permission tier, practice assignments), dashboard data, LOB tool state |
| Azure AD (Entra ID) | Authentication and group membership | Confirms identity. Security groups gate portal access and MCP authorization. |
| Dropbox | File storage | Brand guidelines, logos, template files, reference documents, LOB tool output (permanent) |
| Railway disk | Ephemeral file storage | LOB tool working files before routing to Dropbox |

---

## Data Model

### Content Types (Sanity)

Full schema documented in `portal-data-model-draft.md`. 10 content types:

1. **Template** — Production instructions for a deliverable type. Stores Claude-readable text (rich text / markdown), not raw file attachments. Optional link to reference file in Dropbox.
2. **Prompt Library Entry** — Reusable prompt patterns tied to deliverable types and practices. **This is the proof of concept content type for Step 1.**
3. **Client Brand Package** — Distilled brand voice, tone, messaging, key context. Links to brand guidelines and logo files in Dropbox.
4. **Deliverable Classification** — AI classification (AI-Led / AI-Assisted / Human-Led) by deliverable type.
5. **Quality Gate Definition** — Checklist items, sign-off role, escalation path by deliverable type.
6. **Practice Area** — Practice metadata and relationships.
7. **Capabilities Matrix Entry** — Role × deliverable type × tools × AI classification.
8. **Workflow Guide** — Step-by-step production workflows by practice and deliverable type.
9. **Role** — Role definitions with practice assignments and tool access.
10. **Team Member** — Staff records linked to roles, practices, and permission tiers. Authored profile data (name, role, practice) in Sanity; auth/permission records in PostgreSQL.

Design principles:
- Most fields are optional, not required. Incomplete content is expected — Claude interprets gaps from context, not schema enforcement.
- Templates store distilled instructions as text. The MCP server returns instructions and specs as text, not file attachments.
- All content types have relationship mappings to support the MCP resolution chain.
- File references are links to Dropbox, not uploaded assets.

### Application State (PostgreSQL)

Following Flint's schema pattern:

- **users** — Azure AD Object ID, permission tier (practitioner / practice_leader / admin), practice assignments, created_at
- **api_keys** — Key hash (SHA-256), key prefix (for display), user_id, name, created_at, last_used_at (secondary auth for programmatic/fallback use)
- **dashboard_data** — Adoption metrics, MCP usage tracking, Asana integration data, practice-level aggregations
- **lob_tool_state** — Per-tool transactional state (RFP scraper results, proposal drafts, etc.)

---

## MCP Server Design

### Auth Pattern (OAuth via Claude Teams Connector)

| Step | What Happens |
|---|---|
| Admin setup (once) | Brandon adds the MCP server as a custom connector in Claude Teams org settings with Azure AD OAuth credentials |
| Practitioner setup (once per user) | User goes to Settings → Connectors → clicks Connect → authenticates via Azure AD |
| Every MCP request | OAuth token validated → Azure AD Object ID resolved → permission tier looked up in PostgreSQL → response scoped |

### Tool Design

Each content type added to the portal gets its own discovery session. The prompt library is the proof of concept — the first content type to go end-to-end. Subsequent content types follow the same pattern.

**Core questions for each content type's discovery session:**
- What does a practice leader do with this content in the portal?
- What does a contributor / practitioner see through Claude?
- What does the MCP server return for a read request?
- What does a write request look like (for practice leaders)?
- What scoping rules apply (practice-level, role-level, client-level)?
- What does the response payload look like and how big is it?

**Planned tool structure (middle path — narrow tools + orchestrated assembly):**

Narrow tools for targeted lookups:
- `get_template(deliverable_type, practice?)`
- `get_client_brand_package(client)`
- `get_prompt_chain(deliverable_type)`
- `get_quality_gate(deliverable_type)`
- `get_capabilities_matrix(role?, practice?)`
- `get_workflow_guide(deliverable_type, practice?)`
- `list_templates(practice?)`
- `list_clients()`

Orchestrated tool:
- `assemble_production_context(deliverable_type, client?)` — Resolves the full chain server-side: template + prompts + client package + quality gate + workflow guide. Returns assembled context in one call.

Write tools (practice leader + admin only):
- `add_deliverable_classification(...)`
- `update_workflow_guide(...)`
- `add_prompt_library_entry(...)`
- (Additional write tools defined per content type during discovery)

**The specific tools, their parameters, and their response shapes are defined during each content type's discovery session — not upfront.**

### Context Size Management

- Narrow tools return limited, predictable payloads
- Full production context assembly needs real testing against the 1M context window once content exists
- Flint's MCP tools return small payloads. Portal tools will return richer content. Testing payload sizes is a validation task at each step.

---

## Build Sequence

> Each step requires its own discovery session before building. The sequence is the plan. The specifics emerge from discovery at each step. Each major content type added to the platform is treated as its own feature with its own discovery: what should a practice leader do, what does a contributor see through Claude, what does the MCP server return.

### Step 1: Portal Foundation + Prompt Library (Proof of Concept)

Build the portal shell and prove the end-to-end system with one content type: the prompt library.

**Portal foundation (build):**
- Next.js app on Railway with Auth.js v5 + Entra ID (clone Flint's auth pattern)
- Azure AD security group restricting portal access to admin group
- PostgreSQL schema for users, permission tiers (clone Flint's patterns)
- Sanity self-hosted on Railway with initial schema
- Portal navigation shell with role-based access control
- Sanity Studio as the admin interface

**Prompt library — the proof of concept (discovery + build):**
- Discovery session: What does a prompt library entry look like in Sanity? What fields matter? How does a practice leader create one? What does the MCP server return when a practitioner asks Claude for a prompt? What does a write request look like?
- Build the Sanity schema for Prompt Library Entry
- Build the MCP server (clone Flint's architecture) with OAuth via Claude Teams connector
- Implement `get_prompt_chain` and `list_prompts` read tools
- Implement `add_prompt_library_entry` write tool (practice leader + admin)
- Load initial prompt patterns from existing scattered files and Claude's memory
- Test end-to-end: practitioner opens Claude, queries for a prompt pattern, gets a useful response. Practice leader pushes a new prompt entry through Claude.

**This step proves the entire system works.** Portal → Sanity → MCP → Claude → practitioner. Read and write. Permission scoping. OAuth auth. If this works, every subsequent content type follows the same pattern.

**Depends on:** Sanity self-hosted deployment on Railway (new), prompt library content discovery session.

**Already resolved (by Flint):** MCP server architecture, Railway deployment, GitHub CI/CD, database patterns, schema migration approach.

**Already resolved (by Dropbox/Asana):** OAuth connector flow on Claude Teams.

### Step 2: Templates + Client Brand Packages

Add the next two content types, following the same discovery → build → test pattern proven in Step 1.

**Templates — discovery session:**
- What does a template look like in Sanity? Production instructions as text, link to reference file in Dropbox, associated prompt chain, deliverable type, practice area.
- What does the MCP server return for `get_template`?
- What does a practice leader's workflow look like for creating/updating a template?

**Client Brand Packages — discovery session:**
- What does a brand package look like in Sanity? Distilled voice/tone/messaging as text, links to brand guidelines and logos in Dropbox.
- What does the MCP server return for `get_client_brand_package`?
- Build first packages: WIF, 1792, one or two others.
- Test: practitioner queries client context through Claude, produces client-ready work.

**Also in this step:**
- Implement `assemble_production_context` orchestrated tool — this is the first time the MCP server chains multiple content types together (template + prompts + client package).
- Validate assembled context payload sizes against the 1M context window.

**Depends on:** Step 1 working end-to-end. Template and brand content discovery sessions. Client brand assets collected (at minimum: links to existing Dropbox files + authored voice/tone text).

### Step 3: Deliverable Classifications + Quality Gates + Capabilities Matrix

Add the structured reference data content types.

**Discovery session for each:**
- What fields matter? What does the MCP server return?
- How do practice leaders maintain these? (Portal, Claude write-back, or both?)
- How do these integrate with the production context assembly chain?

**Depends on:** Step 2 (these types are referenced by templates and the assembly tool).

### Step 4: Workflow Guides + Practice Areas + Roles

Add the remaining content types that complete the platform's knowledge model.

**Discovery session for each:**
- What does a workflow guide look like for each practice?
- How are practice areas and roles structured?
- What does the MCP server return?

**Depends on:** Steps 2–3. Practice leader alignment meetings and discovery interviews inform workflow guide content.

### Step 5: Dashboards and Measurement Layer

Wire up adoption tracking and practice leader views.

**Build:**
- Asana API integration for adoption tracking
- MCP usage tracking (who's querying, how often, which content types, which practices)
- Practice leader dashboard views in the portal
- n8n workflows for background data routing (Fireflies transcripts, etc.)

**Depends on:** Defining what metrics matter, Asana API capabilities, n8n workflow design, dashboard UX decisions. MCP usage data is available from Step 1 onward.

### Step 6: Claude Project Architecture

Design and stand up the Claude Project structure.

**Build:**
- Define which Projects exist, what content goes in each, what custom instructions look like, who has access
- Test end-to-end with MCP: practitioner in a Claude Project queries platform content, produces a real deliverable
- Validate content payload sizes in context with Project-level instructions

**Depends on:** Content from Steps 1–4 existing in the platform. Decisions about Project structure (per-practice vs per-client vs both).

### Step 7: LOB Tools

Build the first standalone tool modules in the portal.

**Priority candidates:**
- RFP scraper/finder (already in progress)
- Proposal generator
- Meeting intelligence pipeline (Fireflies → structured summaries)
- Client onboarding playbook builder

Each tool has its own UI in the portal, its own backend logic (n8n workflows, Claude API calls), and its own integration points. Generated files route to Dropbox via n8n.

**Depends on:** n8n automation layer from Step 5, specific tool requirements discovered during practice activations.

### Step 8: Claude Project Setup Wizard

Build the guided workflow that generates everything needed to stand up a new Claude Project.

**Depends on:** Patterns established in Steps 2 and 6.

### Step 9: Content Expansion from Discovery

Ongoing — as practice leader discoveries happen, new content flows into Sanity through the portal or through Claude (practice leader write-back via MCP).

**Depends on:** Practice leader alignment meetings and discovery interviews. The portal is ready to receive this content after Step 1.

### Step 10: Initial Launch

The portal is live with real content across all content types. MCP bridge is working with OAuth. Dashboards are showing data. At least one or two LOB tools are functional. A practitioner can sit in Claude and operate AI-native using platform-managed content.

This is the launchable product.

---

## What Flint Proves

| Question from Original Plan | Answer |
|---|---|
| Can MCP work on Claude Teams? | Yes. Streamable HTTP transport, working in production. (Flint) |
| What auth pattern works with Azure AD? | Auth.js v5 + Entra ID provider. Object ID as stable identifier. SSO only. (Flint) |
| Can we use OAuth for MCP instead of API keys? | Yes — Claude Teams supports custom OAuth connectors. Per-user auth, org-level setup. (Dropbox/Asana pattern) |
| Vercel or Railway for Next.js hosting? | Railway. Single project, auto-deploy from GitHub. (Flint) |
| Do we need Supabase for relational data? | No. Direct PostgreSQL with `postgres` npm package. (Flint) |
| Do we need dedicated file storage? | No. Platform stores text intelligence in Sanity. Files stay in Dropbox. Links bridge them. |
| How does schema migration work? | Idempotent SQL — `IF NOT EXISTS` everywhere, runs on first API call. (Flint) |
| How does deployment work? | Multiple Railway services in one project, shared PostgreSQL, auto-deploy on push to main. (Flint) |

---

## Open Items

- **Sanity self-hosted on Railway**: Not yet deployed. This is the one new infrastructure component that needs to be proven in Step 1.
- **Sanity GROQ → MCP tool responses**: Querying Sanity from an MCP server is a new pattern (Flint queries PostgreSQL directly). Validated in Step 1 with the prompt library proof of concept.
- **OAuth MCP connector with Azure AD**: The pattern is validated by Dropbox/Asana, but building a custom OAuth MCP server against Azure AD is new. Validated in Step 1.
- **Content payload sizes**: Flint's MCP tools return small payloads. Portal tools will return richer content. Tested at each step, with the critical test at Step 2 when `assemble_production_context` chains multiple content types.
- **Cross-practice visibility rules**: Deferred to activation — the schema supports flexible practice assignments.
- **Content inventory session**: Must happen before Step 1 content loading. Existing prompts, templates, and patterns must be cataloged.
- **n8n integration patterns**: Not yet proven. Planned for Step 5.
- **Dropbox MCP write access**: Currently read-only during beta. Once available, practitioners could push generated files to Dropbox through Claude.

---

## Repository Structure (Projected)

Following Flint's pattern — monorepo with separate services:

```
jda-platform/
├── app/                          # Next.js web application (portal)
│   ├── src/
│   │   ├── app/                  # App Router pages and API routes
│   │   │   ├── api/
│   │   │   │   ├── content/      # Sanity content proxy endpoints
│   │   │   │   ├── users/        # User management, permission tiers
│   │   │   │   ├── keys/         # API key management (secondary auth)
│   │   │   │   ├── dashboard/    # Dashboard data endpoints
│   │   │   │   └── tools/        # LOB tool backends
│   │   │   ├── admin/            # Admin content management views
│   │   │   ├── dashboard/        # Practice leader dashboards
│   │   │   ├── tools/            # LOB tool UIs
│   │   │   └── sign-in/          # Auth sign-in page
│   │   ├── components/           # Shared UI components
│   │   └── lib/
│   │       ├── db.ts             # PostgreSQL client + types
│   │       ├── schema.ts         # Table definitions + idempotent migrations
│   │       ├── auth.ts           # Auth.js v5 + Entra ID config
│   │       ├── sanity.ts         # Sanity client + GROQ queries
│   │       └── session.ts        # Session helper
│   └── railway.json
├── mcp/                          # Standalone MCP server (OAuth + API key auth)
│   ├── src/
│   │   └── index.ts              # HTTP server + OAuth handler + platform MCP tools
│   └── railway.json
├── sanity/                       # Sanity Studio (self-hosted)
│   ├── schemas/                  # Content type schemas
│   └── railway.json
└── n8n/                          # n8n config (if self-hosted, Step 5)
    └── railway.json
```

---

*This document supersedes `portal-01-foundation.md` as the working implementation plan. It incorporates all decisions from the original plan and updates them against Flint's verified production architecture, the Claude Teams OAuth connector pattern, and the resolved storage architecture.*
