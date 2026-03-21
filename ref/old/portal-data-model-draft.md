# Platform Data Model — Initial Schema Design

> **STATUS:** Discovery draft. Needs review and iteration before implementation.
> **FORMAT:** Conceptual schema descriptions, not final Sanity schema code. Will be translated to Sanity schema definitions during build.

---

## Design Principles

1. Every content type exists to answer a question Claude might ask through the MCP server. The schema is designed around the resolution chain: a practitioner makes a request in Claude → the MCP server queries the portal → the portal assembles the full production context from related content objects → Claude receives everything it needs to produce the deliverable.

2. Most fields are optional, not required. Incomplete content (e.g., a client with a rich visual brand but zero verbal brand) is expected and handled gracefully — Claude interprets gaps from context, not schema enforcement. The MCP server returns what exists. Claude handles what's missing.

---

## Core Content Types

### 1. Template

**What it is:** A deliverable type that someone at JDA produces, packaged with everything needed to produce it using AI. Not just a file — a complete production blueprint.

**Fields:**
- `name` — Display name (e.g., "Interactive Client Presentation," "Pre-Discovery Brief," "Press Release")
- `slug` — URL-friendly identifier
- `deliverableType` — Reference → Deliverable Classification
- `practiceArea` — Reference → Practice Area (Brand, StratComm, Creative, etc.)
- `description` — What this template produces and when it's used
- `outputFormat` — What the deliverable actually is (HTML artifact, Word doc, PDF, slide deck, etc.)
- `templateFile` — The artifact itself, if a static file exists (optional — some templates are generated entirely by Claude from instructions)
- `productionInstructions` — Rich text / markdown. The step-by-step workflow for producing this deliverable with AI. This is the core IP — the "recipe" that encodes fluency into a repeatable process.
- `promptChain` — Array of Prompt Library Entry references, in sequence. The actual prompts that go into Claude to produce this deliverable.
- `brandingSpecs` — Rich text / markdown. Formatting and design specifications (fonts, colors, layout rules, etc.) that apply regardless of client. For client-specific branding, see Client Brand Package.
- `qualityGate` — Reference → Quality Gate Definition
- `toolsRequired` — Array of strings (e.g., ["Claude", "Cursor", "Midjourney"])
- `aiClassification` — AI-Led / AI-Assisted / Human-Led (inherited from Deliverable Classification but can be overridden per template)
- `roleVisibility` — Array of Role references. Who can see this template in the portal / who gets it served via MCP.
- `exampleOutput` — File or link to an example of a completed deliverable using this template (optional, powerful for training)
- `version` — Version number
- `lastUpdated` — Timestamp
- `author` — Who created/maintains this template

**Relationships:**
- → Deliverable Classification (what category of work this is)
- → Practice Area (which practice owns it)
- → Prompt Library Entries (the prompts used to produce it)
- → Quality Gate Definition (what "done" looks like)
- → Role (who can access it)

---

### 2. Prompt Library Entry

**What it is:** A single prompt or prompt instruction that's used in producing deliverables. Can be standalone or part of a chain referenced by a template.

**Fields:**
- `name` — Display name (e.g., "Brand Messaging Framework — Initial Generation," "Press Release Draft — Client Voice")
- `slug` — URL-friendly identifier
- `practiceArea` — Reference → Practice Area
- `deliverableType` — Reference → Deliverable Classification (optional — some prompts are general-purpose)
- `promptText` — The actual prompt. Rich text / markdown. May include placeholders like `{{client_name}}`, `{{brand_voice}}`, `{{deliverable_context}}` that get resolved at runtime.
- `contextNotes` — When to use this prompt, what context to provide, what to watch out for
- `guardrails` — Constraints or things the prompt should explicitly avoid
- `expectedOutput` — What a good result looks like from this prompt
- `toolTarget` — Which tool this prompt is for (Claude, Midjourney, etc.)
- `roleVisibility` — Array of Role references
- `version` — Version number
- `lastUpdated` — Timestamp

**Relationships:**
- → Practice Area
- → Deliverable Classification (optional)
- → Role (who can access it)
- ← Referenced by Templates (many-to-many — a prompt can be used in multiple template chains)

---

### 3. Client Brand Package

**What it is:** Everything Claude needs to know about a specific client's brand to produce work that's on-brand. This is what gets loaded when someone says "using WIF branding."

**Fields:**
- `clientName` — Display name
- `slug` — URL-friendly identifier
- `brandGuidelines` — File upload (PDF, etc.) or rich text. The visual identity standards.
- `voiceDoc` — File upload or rich text. The brand voice, tone, messaging pillars.
- `colorPalette` — Structured data (hex codes, usage notes)
- `typography` — Structured data (font families, sizes, weights, usage)
- `logoAssets` — Array of file uploads with usage notes (primary, secondary, icon, etc.)
- `keyMessaging` — Rich text. Core messages, taglines, positioning statements.
- `targetAudience` — Rich text. Who the client's audience is, how they talk, what they care about.
- `projectHistory` — Rich text. Key projects completed, what worked, what to maintain.
- `keyContacts` — Array of objects (name, role, relationship notes)
- `claudeProjectReference` — Text. Which Claude Project(s) this client's content lives in, for cross-referencing.
- `activeEngagements` — Rich text or structured data. Current projects, retainer scope, etc.
- `doNotDo` — Rich text. Things to explicitly avoid for this client — past issues, sensitivities, brand no-gos.

**Relationships:**
- ← Referenced by Templates when producing client-specific work
- ← Referenced by Claude Projects (a Claude Project for a client loads this package)

---

### 4. Deliverable Classification

**What it is:** A category of work product that JDA produces. The taxonomy that organizes everything else.

**Fields:**
- `name` — Display name (e.g., "Press Release," "Brand Messaging Framework," "Interactive Presentation," "Website Build," "Social Media Calendar")
- `slug` — URL-friendly identifier
- `practiceArea` — Reference → Practice Area
- `aiClassification` — AI-Led / AI-Assisted / Human-Led. The default classification for this deliverable type.
- `description` — What this deliverable is and when JDA produces it
- `typicalTimeline` — How long this deliverable typically takes (legacy vs AI-native — useful for capacity measurement)
- `standardTemplate` — Reference → Template (the default template for this deliverable type, if one exists)

**Relationships:**
- → Practice Area
- → Template (default)
- ← Referenced by Templates, Prompt Library Entries, Quality Gate Definitions, Capabilities Matrix

---

### 5. Quality Gate Definition

**What it is:** The checklist and sign-off requirements for a specific deliverable type. What "done" looks like before it ships.

**Fields:**
- `name` — Display name (e.g., "Press Release QA," "Website Build QA")
- `deliverableType` — Reference → Deliverable Classification
- `checklistItems` — Array of objects:
  - `item` — What to check (e.g., "Client voice consistency," "Brand color compliance," "Factual accuracy," "CTA present and clear")
  - `description` — How to check it
  - `required` — Boolean
- `signOffRole` — Reference → Role. Who signs off on this deliverable type.
- `escalationPath` — Rich text. What happens when the deliverable doesn't pass the gate.
- `aiSpecificChecks` — Array of objects. Checks that are specific to AI-generated content (e.g., "Verify no hallucinated facts," "Check for generic AI phrasing," "Confirm client-specific details are accurate")

**Relationships:**
- → Deliverable Classification
- → Role (sign-off)
- ← Referenced by Templates

---

### 6. Practice Area

**What it is:** An organizational unit at JDA. Used for scoping content and access.

**Fields:**
- `name` — Display name (e.g., "Brand," "Strategic Communications," "Creative," "Development," "Digital Experience," "Account Services," "Operations," "Business Development")
- `slug` — URL-friendly identifier
- `practiceLeader` — Reference → Team Member
- `description` — What this practice does
- `activationGroup` — Which activation group this practice is in (1, 2, 3, 4)
- `activationStatus` — Not started / In discovery / Activating / Active

**Relationships:**
- → Team Member (practice leader)
- ← Referenced by Templates, Prompt Library Entries, Deliverable Classifications, Capabilities Matrix

---

### 7. Capabilities Matrix Entry

**What it is:** A mapping of what tools apply to what roles for what deliverable types. The "who uses what for what" reference.

**Fields:**
- `role` — Reference → Role
- `deliverableType` — Reference → Deliverable Classification
- `tools` — Array of strings (Claude, Cursor, Midjourney, etc.)
- `aiClassification` — AI-Led / AI-Assisted / Human-Led (for this specific role + deliverable combination)
- `notes` — Any specific guidance for this combination

**Relationships:**
- → Role
- → Deliverable Classification

---

### 8. Workflow Guide

**What it is:** A step-by-step process for completing a specific type of work. Broader than a template — it covers the full workflow, not just the AI production step.

**Fields:**
- `name` — Display name (e.g., "Client Onboarding Process," "New Website Build Workflow," "Crisis Response Protocol")
- `slug` — URL-friendly identifier
- `practiceArea` — Reference → Practice Area
- `description` — When this workflow applies
- `steps` — Array of objects:
  - `stepNumber` — Integer
  - `title` — Step name
  - `description` — What happens in this step
  - `tools` — Array of strings
  - `templateReference` — Reference → Template (optional — if this step uses a specific template)
  - `owner` — Who typically does this step (role, not person)
- `roleVisibility` — Array of Role references
- `version` — Version number
- `lastUpdated` — Timestamp

**Relationships:**
- → Practice Area
- → Templates (referenced within steps)
- → Role (visibility and step ownership)

---

### 9. Role

**What it is:** An access tier in the platform. Maps to Azure AD groups.

**Fields:**
- `name` — Display name
- `slug` — URL-friendly identifier
- `azureAdGroup` — The corresponding Azure AD group identifier
- `accessTier` — Practitioner / Practice Leader / Admin (NewCo)
- `description` — What this role can see and do
- `practiceArea` — Reference → Practice Area (optional — some roles are cross-practice)
- `toolAccess` — Array of objects:
  - `tool` — String (Claude Standard, Claude Premium, Cursor, Midjourney, etc.)
  - `accessLevel` — Standard / Premium / As Needed

**Relationships:**
- → Practice Area (optional)
- → Azure AD group
- ← Referenced by Templates, Prompt Library Entries, Workflow Guides, Capabilities Matrix, Quality Gates

---

### 10. Team Member

**What it is:** A person at JDA. Used for authorship, practice leadership references, and key contacts.

**Fields:**
- `name` — Display name
- `role` — Reference → Role
- `practiceArea` — Reference → Practice Area
- `title` — Job title
- `email` — Email address

**Relationships:**
- → Role
- → Practice Area

---

## MCP Resolution Chain

When a practitioner in Claude says something like "create an interactive client presentation for our Strategic Marketing Plan using the WIF branding," the MCP server needs to resolve that into a full production context. The query flow:

1. **Identify the template:** Match "interactive client presentation" → Template where `name` or `deliverableType` matches
2. **Get production instructions:** Return the template's `productionInstructions`
3. **Get the prompt chain:** Follow the template's `promptChain` references → return the ordered Prompt Library Entries with their `promptText`
4. **Get client branding:** Match "WIF" → Client Brand Package → return `brandGuidelines`, `voiceDoc`, `colorPalette`, `typography`, `keyMessaging`
5. **Get quality standards:** Follow the template's `qualityGate` reference → return the Quality Gate Definition with `checklistItems`
6. **Get formatting specs:** Return the template's `brandingSpecs` and `outputFormat`

Claude receives all of this as context and has everything it needs to produce the deliverable.

---

## Open Questions

- **Search and matching:** How does the MCP server match a natural language request ("interactive client presentation") to the right template? Exact name match? Keyword search? Claude interprets and the MCP server does a structured query? This needs design.
- **Placeholder resolution:** Prompts may contain placeholders like `{{client_name}}`. Where does resolution happen — in the MCP server before returning to Claude, or does Claude handle it from context? (Current decision: Claude handles from context — simpler and more flexible.)
- **File handling:** Some templates include actual files (Word docs, HTML files). How does the MCP server return these to Claude? (Current decision: production instructions as distilled text, not raw files. The `templateFile` field exists as a reference artifact but the MCP server returns instructions, not files.)
- **Content size:** A full production context (template + prompts + client package + quality gate) could be substantial. How much of the 1M context window does a typical resolution consume? Needs real testing once content exists.
- **Versioning workflow:** When a template is updated in the portal, what happens to Claude Projects that have an older version loaded via file sync? (This is a Step 5 concern for the file sync MVP, not a Step 1 blocker. MCP always returns current content.)

---

*This is a discovery draft. Every content type needs validation against real deliverables and real workflows before the schema is finalized.*
