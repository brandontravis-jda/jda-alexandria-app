# JDA AI-Native Platform — Build Plan

> **WORK SESSION NEEDED:** Each step below requires its own discovery and planning session before building begins. The sequence is the plan. The specifics emerge from discovery at each step.

---

## Architecture Overview

The platform is a structured content and knowledge layer that makes Claude operationally intelligent for JDA (and eventually for external organizations). It consists of four components:

**The Portal** — A web app (Azure AD gated, role-based access) that manages all platform content: templates, prompt libraries, workflow guides, client brand packages, capabilities matrix, deliverable classification, quality gate definitions. Also houses LOB tools (RFP scraper, proposal generator, etc.) and practice leader dashboards.

**The Bridge** — The connection between the portal and Claude's native interface. Ideal: an MCP server exposing the portal's content API so Claude can query it live. MVP fallback: structured file export from the portal, packaged for upload into Claude Projects, with sync notifications when content changes.

**The Automation Layer** — n8n as the nervous system connecting the portal to Asana, Fireflies, Slack, and other operational tools. Handles background workflows (transcript routing, dashboard data, notifications) and powers LOB tool backends.

**The Claude Environment** — Properly structured Claude Projects per practice area and per client, loaded with platform content. The practitioner works in Claude. The platform ensures Claude has the right knowledge for the practitioner's role, practice, and client context.

### Key Architecture Principle

The portal is NOT where practitioners go to do their work. Claude is. The portal is the management layer where content is created, organized, and published into Claude's ecosystem. The practitioner experience is: open Claude, and Claude already knows how JDA works — because the platform fed it the context.

LOB tools (RFP scraper, proposal generator, meeting intelligence) are the exception — these are standalone applications that live in the portal because they do things Claude can't do natively.

---

## Build Sequence

### Step 1: Portal Foundation
Build the web app. Azure AD authentication, role-based access control, data model for all content types, admin interface for creating and managing content. The shell with navigation and the structure that content lives in. No content yet.

**Depends on:** Data model design, tech stack decisions, Azure AD group mapping, content type schema design.

### Step 2: MCP Server
Build alongside the portal. Expose the portal's content API through an MCP server so Claude can query it live. Test the connection on the Team account with Opus 4.6 and the 1M context window. Validate that a practitioner in Claude can pull portal content in real time.

If MCP is unreliable on Claude Teams: build the file export workflow — structured markdown/PDF packages generated from the portal, ready for upload into Claude Projects, with sync notifications when content changes.

**Depends on:** MCP protocol spec research, Claude Teams MCP stability testing with 1M context window, portal content API being functional.

### Step 3: Dashboards and Measurement Layer
Wire up Asana API integration for adoption tracking. Build practice leader dashboard views in the portal. Connect n8n for background data routing (Fireflies transcripts, etc.).

**Depends on:** Defining what metrics matter, Asana API capabilities, n8n workflow design, dashboard UX decisions.

### Step 4: Initial Content Population
Load the portal with everything that already exists — current templates (Word doc system, HTML presentation framework), prompt patterns, capabilities matrix, deliverable classification guide, tool allocation table, quality gate definitions. Content moves from scattered files and Claude's memory into the portal's structured data model.

**Depends on:** The file inventory session (flagged in the fluency-vs-capability doc). Content must be cataloged before it can be structured and loaded.

### Step 5: Claude Project Architecture
Design and stand up the Claude Project structure — which Projects exist, what content goes in each, what custom instructions look like, who has access. Test end-to-end: practitioner opens Claude, queries the platform (via MCP or loaded Project files), produces a real deliverable.

**Depends on:** MCP validation from Step 2, content from Step 4, decisions about Project structure (per-practice vs per-client vs both).

### Step 6: Client Content Packages
Build the first client brand packages in the portal — WIF, 1792, and one or two others. Brand guidelines, voice docs, key context. Test whether the system produces client-ready work when a practitioner uses them through Claude.

**Depends on:** Client brand assets being collected and structured, the content package schema from Step 1, Claude Project architecture from Step 5.

### Step 7: LOB Tools
Build the first active tool modules in the portal. Priority candidates:
- RFP scraper/finder (already in progress)
- Proposal generator
- Meeting intelligence pipeline (Fireflies → structured summaries)
- Client onboarding playbook builder

Each tool has its own UI in the portal, its own backend logic (n8n workflows, Claude API calls), and its own integration points.

**Depends on:** n8n automation layer from Step 3, specific tool requirements discovered during practice activations.

### Step 8: Claude Project Setup Wizard
Build the guided workflow in the portal that generates everything needed to stand up a new Claude Project — custom instructions, file packages, setup checklist. This is what scales the system beyond manually configured Projects.

**Depends on:** Patterns established in Steps 5 and 6, understanding of what a "standard" Claude Project setup looks like across different use cases.

### Step 9: Content Expansion from Discovery
As practice leader discoveries happen, new content flows into the portal — practice-specific prompt libraries, workflow guides, deliverable templates. Each discovery produces portal content. The platform deepens with every practice activated.

**Depends on:** Practice leader alignment meetings and discovery interviews. This step is ongoing — from a build perspective, the portal is ready to receive this content after Step 4.

### Step 10: Initial Launch
The portal is live with real content. The bridge to Claude is working (MCP or file sync). Dashboards are showing data. At least one or two LOB tools are functional. A practitioner can sit in Claude and operate AI-native using platform-managed content.

This is the launchable product.

---

## Step 1 Discovery: Portal Foundation

### Decisions Made

**Content store: Sanity (self-hosted)**
- Sanity serves as the content management backbone for the entire platform
- Self-hosted on JDA's existing Railway/Vercel infrastructure — no third-party data hosting concerns for IP-sensitive content
- Sanity Studio provides the admin interface for content creation and management — no custom admin UI build required
- Sanity's GROQ API serves both the portal frontend and the MCP server from the same data source
- Sanity is also under evaluation as JDA's recommended client production stack (WordPress replacement), but the platform decision is independent of that evaluation — different use cases, different requirements
- Long-term: self-hosted deployment addresses IP protection concerns for the productized platform (Product Lines 4/5)

**Data model: 10 content types defined**
- Full schema documented in `portal-data-model-draft.md`
- Core types: Template, Prompt Library Entry, Client Brand Package, Deliverable Classification, Quality Gate Definition, Practice Area, Capabilities Matrix Entry, Workflow Guide, Role, Team Member
- All content types have relationship mappings to support the MCP resolution chain
- Design principle: most fields are optional, not required. Incomplete content (e.g., a client with visual brand but no voice doc) is expected and handled gracefully — Claude interprets gaps from context, not schema enforcement

**File handling: distilled instructions, not raw files**
- Templates store production instructions as Claude-readable text (rich text / markdown), not raw file attachments
- The `templateFile` field exists as an optional reference artifact, but the MCP server returns instructions and specs as text, not files
- This mirrors the working pattern Brandon already uses: provide Claude with the knowledge of how to build something (like the JDA doc style guide in memory), not the file itself
- Keeps MCP context consumption manageable

**MCP tool design: middle path**
- Specific narrow tools for targeted lookups: `get_template`, `get_client_brand_package`, `get_prompt_chain`, `get_quality_gate`, etc.
- Plus one orchestrated tool: `assemble_production_context(deliverable_type, client)` that resolves the full chain server-side and returns assembled context in one call
- Server-side assembly handles matching logic and gap detection rather than depending on Claude to orchestrate multiple calls
- Narrow tools keep MCP tool definition overhead low (important for context window management)

**Content size management: narrow tools over broad search**
- Specific request tools with limited, predictable context payloads — not a `search_everything` tool that dumps unbounded content
- Full production context assembly (template + prompts + client package + quality gate) needs real testing against the 1M context window once content exists — flagged as a Step 2/Step 5 validation task

**Nuclear option acknowledged**
- If MCP integration with Claude Teams proves unworkable, the entire platform can be built as a self-contained web app using Claude's API directly, with no dependency on the native Claude interface
- This trades the native Claude experience (Projects, Cowork, Code, artifacts) for complete control over the practitioner experience
- Not the recommended path for JDA internal use, but potentially the right architecture for Product Line 4 (white-labeled production studio for outside agencies)
- The content model, data architecture, and portal are identical regardless of which path is taken — only the bridge layer changes

### Remaining Questions for Step 1

**Tech stack: resolved**
- **Framework:** Next.js (TypeScript + Tailwind + React)
- **Content store:** Sanity (self-hosted on Railway)
- **Application layer:** Supabase (portal auth, internal permission assignments, relational data that doesn't fit a CMS model)
- **Hosting:** Vercel (portal frontend, serverless API routes) + Railway (Sanity, Supabase, n8n, potentially MCP server if it requires persistent connections)
- **Source control / CI/CD:** GitHub
- **Automation:** n8n on Railway
- This is JDA's current recommended stack (Tailwind + TypeScript + React + Sanity on Vercel + GitHub, Railway for complexity). No reason to introduce alternatives.

**Separation of concerns:**
- Sanity = content store (templates, prompts, client packages, workflow guides — the CMS content model)
- Supabase = application layer (user permission assignments, portal auth, any relational data needs)
- Azure AD = authentication and provisioning (confirms the user is a JDA team member and lets them in the door)
- Portal = authorization (looks up the user's permission tier in Supabase and scopes their experience)

**Relationship to existing intranet: separate app**
- The intranet operates at the Prolific layer, has no clear owner, and serves general company information
- The platform operates at the JDA layer, Brandon owns it, and it serves a specific operational function
- Clean separation avoids inheriting the intranet's problems (unclear ownership, stale content, Prolific-layer politics)
- Azure AD app registration infrastructure from the intranet can be leveraged — the auth pattern is known ground

**Azure AD integration: resolved**
- Azure AD handles authentication and provisioning only (is this person a JDA team member?)
- The portal handles authorization internally via Supabase (what can this person see and do?)
- No dependency on Colton or IT for day-to-day permission management
- One Azure AD app registration needed — Brandon knows how to do this
- MCP server auth is separate: API token, not user identity

**Role taxonomy: resolved in principle**
- Three tiers: Practitioner, Practice Leader, Admin (NewCo)
- Managed inside the portal via Supabase, not in Azure AD groups
- Scoping: practice-level for Practitioners (Brand practitioner sees Brand content), full practice + dashboards for Practice Leaders, everything for Admin
- Cross-practice visibility to be determined during activation — may need flexibility for roles like Account Services that touch multiple practices

**Admin workflow: resolved**
- Brandon creates all content initially
- Practice leaders contribute during activation
- NewCo team long-term
- Direct publish with version history (Sanity provides this natively) — no review/publish cycle during activation for speed
- Can add approval workflows later if needed

---

## Step 1: Ready to Build

All foundation discovery questions are resolved. The portal can be built with:
- Next.js + TypeScript + Tailwind on Vercel
- Sanity (self-hosted on Railway) as the content store, with schema from `portal-data-model-draft.md`
- Supabase on Railway for portal auth and internal permissions
- Azure AD for SSO authentication
- API layer designed from day one to support MCP server consumption (Step 2)

Next discovery session: Step 2 (MCP Server) — MCP protocol spec research, server architecture, Claude Teams stability testing with 1M context window.

---

*This document is the working build plan. It will be updated as discovery progresses and decisions are made at each step.*
