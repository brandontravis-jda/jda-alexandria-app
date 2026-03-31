# Step 4 Discovery Output + Downstream Plan Updates

> Discovery session completed March 30, 2026. This document contains:
> 1. The updated Step 4 spec — ready to build
> 2. Schema updates to the existing methodology content type (Step 2 carry-forward)
> 3. Step 6 dependency notes that must be preserved for the measurement layer build

---

## Part 1: Updated Step 4 Spec

### Step 4: Capabilities Matrix

**Status:** Discovery complete. Ready to build.

**What this replaces:** The original Step 4 ("Deliverable Classifications + Quality Gates + Capabilities Matrix") was an AI-generated placeholder with unresolved questions. Discovery has resolved all of them. The original framing treated these as three separate content types. They are not. See schema decisions below.

---

### What We're Building and Why

The Capabilities Matrix is the living map of everything JDA produces, scored by AI role and tracked through the transformation lifecycle. It serves two audiences with two distinct surfaces:

**Practitioners (via Claude/MCP):** When a practitioner asks what AI can do for a given deliverable type, Claude queries the Capability Record and returns the appropriate response — a methodology for AI-Led work, or an honest capability assessment with a live web search supplement for Human-Led work.

**Leadership (via portal):** Chance and practice leaders need a navigable, filterable view of the full deliverable landscape — how many workflows have been identified, how many are classified, how many have methodologies, how many have reached Proven Status. This is the business planning instrument for the transformation.

Both surfaces are fed by the same underlying data: Capability Records in Sanity.

---

### What We're NOT Building in Step 4

Two items from the original Step 4 spec are resolved differently:

**Deliverable Classifications as a separate content type:** Not needed. The AI-Led / AI-Assisted / Human-Led classification is a field on the methodology schema, not a standalone lookup. See the methodology schema updates in Part 2.

**Quality Gates as a separate content type:** Not needed. Quality gates are a structured field within each methodology — Claude surfaces them as a handoff checklist at the end of every production run. They are not a separate system Claude executes autonomously. See the methodology schema updates in Part 2.

---

### The Status Model

Every Capability Record has one of four statuses. This is the core data model for the transformation dashboard.

| Status | Definition |
|---|---|
| **Not Evaluated** | Deliverable type identified (from KIRU, Asana history, practice leader input) but not yet reviewed in a Discovery Intensive. No classification confirmed. No methodology exists. |
| **Classified** | Discovery Intensive has been completed. Deliverable type has a confirmed AI-Led / AI-Assisted / Human-Led classification. Methodology not yet built. |
| **Methodology Built** | A methodology exists in Alexandria and is linked to this record. MCP can serve it. |
| **Proven Status** | Methodology has been used to produce and ship at least three client-facing deliverables through the gatekeeper model. Before/after production time data captured. Practice leader has validated output quality. |

Proven Status criteria (from playbook Section 3.3):
- Documented AI-native workflow exists and is in the prompt library
- Quality checklist is documented and in use
- Successfully produced and shipped to a client at least three times through the gatekeeper model
- Before/after production time data captured
- Practice leader has validated output quality

---

### Capability Record: Sanity Schema

**Document type:** `capabilityRecord`

```javascript
{
  name: 'capabilityRecord',
  title: 'Capability Record',
  type: 'document',
  fields: [
    // Identity
    { name: 'deliverableName', type: 'string', title: 'Deliverable Name' },
    { name: 'practiceArea', type: 'string', title: 'Practice Area',
      options: { list: ['Brand', 'Creative Campaign', 'Creative Digital', 'Strategic Communications',
                        'Digital Experience', 'Development', 'Business Development',
                        'Account Services', 'Operations'] }
    },
    { name: 'slug', type: 'slug', title: 'Slug', options: { source: 'deliverableName' } },

    // Status + Classification
    { name: 'status', type: 'string', title: 'Status',
      options: { list: ['not_evaluated', 'classified', 'methodology_built', 'proven_status'] }
    },
    { name: 'aiClassification', type: 'string', title: 'AI Classification',
      options: { list: ['ai_led', 'ai_assisted', 'human_led'] },
      description: 'Required when status is classified or beyond.'
    },

    // Methodology link
    { name: 'linkedMethodology', type: 'reference', to: [{ type: 'methodology' }],
      title: 'Linked Methodology',
      description: 'Required for all records at methodology_built status or beyond. Every classification type has a methodology — AI-Led methodologies describe how to produce; Human-Led methodologies describe the current AI ceiling and support role.'
    },

    // Capability Assessment (Human-Led and AI-Assisted records)
    { name: 'currentAiCeiling', type: 'text', title: 'Current AI Ceiling',
      description: 'Honest assessment of what AI cannot yet do reliably for this deliverable type. Required for human_led and ai_assisted classifications.'
    },
    { name: 'aiSupportRole', type: 'text', title: 'AI Support Role',
      description: 'What Claude can do to support the human leading this work — research, drafting upstream, structuring outputs, etc.'
    },
    { name: 'recommendedToolStack', type: 'array', of: [{ type: 'string' }],
      title: 'Recommended Tool Stack'
    },
    { name: 'ceilingLastReviewed', type: 'datetime', title: 'Ceiling Last Reviewed',
      description: 'Timestamp of last human review of the AI ceiling assessment. Claude uses this to flag assessments that may be stale and trigger a live web search supplement.'
    },
    { name: 'liveSearchEnabled', type: 'boolean', title: 'Enable Live Search Supplement',
      description: 'When true, Claude performs a web search for current tool capability before returning the capability assessment. Recommended for all human_led records.'
    },

    // Proven Status tracking
    { name: 'provenStatusAchievedAt', type: 'datetime', title: 'Proven Status Achieved At' },
    { name: 'baselineProductionTime', type: 'string', title: 'Baseline Production Time',
      description: 'Legacy production time estimate from Discovery Intensive. Example: "4–6 hours"'
    },
    { name: 'aiNativeProductionTime', type: 'string', title: 'AI-Native Production Time',
      description: 'Observed production time using AI-native workflow. Populated after Proven Status.'
    },

    // Source tracking
    { name: 'source', type: 'string', title: 'Data Source',
      options: { list: ['kiru_case_study', 'asana_history', 'discovery_intensive', 'practice_leader_input', 'manual'] },
      description: 'How this record was identified. KIRU case study is the primary seed source for initial load.'
    },
    { name: 'notes', type: 'text', title: 'Notes' },
  ]
}
```

---

### MCP Tools

**`alexandria_get_capability`**

Returns the capability assessment for a given deliverable type. Behavior varies by classification:

- **AI-Led:** Returns classification, links practitioner to the associated methodology. Response: "This is an AI-Led deliverable. Alexandria has a full production methodology for this. Use: `I need to build a [deliverable type] from Alexandria.`"
- **AI-Assisted:** Returns classification, AI support role, recommended tool stack, links to methodology.
- **Human-Led:** Returns current AI ceiling, AI support role, ceiling timestamp, recommended tool stack. If `liveSearchEnabled` is true, Claude performs a web search to supplement the authored assessment with current tool capability information before responding. Response includes the timestamp so practitioners know when the baseline assessment was written.

**`alexandria_list_capabilities`**

Returns all Capability Records, optionally filtered by practice area, classification, or status. Used for portal-side browsing and by `alexandria_help` to surface what exists.

**`alexandria_update_capability`** *(practice_leader and admin tier only)*

Write tool for updating the capability assessment fields on a record — `currentAiCeiling`, `aiSupportRole`, `recommendedToolStack`, `ceilingLastReviewed`, `liveSearchEnabled`. Allows practice leaders to update assessments through Claude without touching Sanity Studio directly.

**`alexandria_log_capability_gap`** *(all tiers)*

Logs a practitioner request for a deliverable type that doesn't have a Capability Record yet. Creates a `not_evaluated` stub record. Feeds the "unidentified deliverable types" backlog in the portal. This is the mechanism by which the matrix grows over time.

---

### Portal: Capabilities Matrix Page

A navigable, filterable table in the portal. This is the management layer where Brandon and practice leaders own the data.

**Columns:** Deliverable Name, Practice Area, Status, AI Classification, Last Reviewed, Proven Status flag, Linked Methodology (linked)

**Filters:** Practice Area, Status, AI Classification, Proven Status

**Actions per row:** Edit record (opens Sanity Studio or inline form), View linked methodology, Mark as reviewed, Log baseline production time

**Access:** Admin and Practice Leader tiers. Practice leaders see only their practice area's records. Admins see all.

**Seeding note:** Initial records are loaded from the KIRU case study deliverable inventory (see seeding section below). These load as `not_evaluated` status. Discovery Intensives are the process that moves records from `not_evaluated` to `classified` and beyond.

---

### Initial Seed Data: KIRU Case Study

The KIRU case study provides the initial deliverable inventory. Load all of the following as `not_evaluated` Capability Records with `source: 'kiru_case_study'`. These are starting points — Discovery Intensives will validate, add, and correct them.

**Brand Strategy**
- Brand positioning and concept development
- Competitive analysis
- Audience persona development
- Brand messaging framework
- Brand voice and tone documentation

**Brand Identity**
- Visual identity system (color, typography, personality)
- Logo system (wordmark, icon, lockup variants)
- Brand guidelines documentation

**Website**
- Website strategy and information architecture
- Website specification and content brief
- Full-stack website build (Next.js)
- Online ordering system
- Reservation system
- Loyalty program
- Admin dashboard and CRM

**Copy and Content**
- Website copy (full site)
- Email sequence copy
- Social media copy and calendar
- Ad copy (multi-platform variants)
- In-restaurant collateral copy
- Menu development and copy

**Email**
- Branded HTML email templates
- Triggered email system (confirmation, welcome series, follow-up)

**PR**
- Press release
- Media pitch variants
- Media target list
- Founder fact sheet and talking points
- Crisis communications framework

**Paid Media**
- Paid media strategy (multi-channel)
- Ad creative briefs
- KPI framework and attribution model

**Social and Community**
- Social media content calendar
- Community management playbook
- Influencer outreach strategy and templates
- UGC guidelines

**Video and Animation**
- Brand video (concept, script, production)
- Logo animation
- Social video clips

**Photography and Imagery**
- Brand photography direction and prompts
- Food photography direction and prompts
- Environmental and lifestyle imagery direction

---

### Human-Led Methodology: Authoring Requirement

Human-Led Capability Records require a corresponding methodology record. Unlike AI-Led methodologies (which describe how to produce), Human-Led methodologies follow a different structure:

**Human-Led Methodology Structure:**
1. **What this deliverable is** — definition and when it applies
2. **Why AI doesn't lead this** — the honest reasoning (presence requirement, verification burden, client sensitivity, craft judgment, etc.)
3. **Current AI ceiling** — what AI cannot reliably do for this type of work, with `lastReviewed` date
4. **AI support role** — specific stages where AI accelerates the human-led workflow
5. **Recommended tool stack** — which tools to use and where in the workflow
6. **Live search instruction** — standing instruction to Claude: "Before responding on current AI capability for this deliverable type, perform a web search for the latest tool capabilities and supplement this assessment with what you find."
7. **Quality checklist** — human review standards that apply to the AI-assisted portions

This means initial Human-Led methodology authoring is a required dependency before Human-Led records can reach `methodology_built` status. These are shorter to write than AI-Led methodologies but they need to exist. Video production, logo production, brand discovery sessions, and crisis communications are the priority Human-Led methodologies to author first.

---

## Part 2: Methodology Schema Updates (Step 2 Carry-Forward)

These changes update the existing `methodology` Sanity schema. They are not new content types — they are field additions to what's already built.

### Fields to Add to the `methodology` Schema

```javascript
// Add to existing methodology schema:

{ name: 'aiClassification', type: 'string', title: 'AI Classification',
  options: { list: [
    { title: 'AI-Led — AI generates primary output, human reviews and approves', value: 'ai_led' },
    { title: 'AI-Assisted — Human leads, AI accelerates specific stages', value: 'ai_assisted' },
    { title: 'Human-Led — Human judgment is primary, AI supports upstream', value: 'human_led' }
  ]}
},

{ name: 'provenStatus', type: 'boolean', title: 'Proven Status',
  description: 'True when this methodology has been used to produce and ship at least three client-facing deliverables through the gatekeeper model, with before/after time data captured and practice leader validation.'
},

{ name: 'provenStatusAchievedAt', type: 'datetime', title: 'Proven Status Achieved At',
  hidden: ({ document }) => !document?.provenStatus
},

{ name: 'qualityChecklist', type: 'array', title: 'Quality Checklist',
  of: [{
    type: 'object',
    fields: [
      { name: 'gate', type: 'string', title: 'Gate Name' },
      { name: 'description', type: 'text', title: 'What to check' },
      { name: 'tier', type: 'string', title: 'Who performs this check',
        options: { list: ['practitioner', 'practice_leader', 'gatekeeper'] }
      }
    ]
  }],
  description: 'Human-executed checklist Claude surfaces at the end of every production run for this methodology. Claude does not run these gates — it surfaces them as a handoff prompt.'
},

{ name: 'baselineProductionTime', type: 'string', title: 'Legacy Baseline Production Time',
  description: 'How long this deliverable type took before AI-native production. From Discovery Intensive estimates. Example: "4–6 hours from brief to delivery."'
},
```

### MCP Response Updates

The `alexandria_get_methodology` tool response should include `aiClassification`, `provenStatus`, and `qualityChecklist` in its return payload.

`qualityChecklist` should be surfaced by Claude at the end of every methodology production run as a structured handoff block, not inline with the production instructions. Suggested Claude behavior: after delivering the final output, append a "Before this goes downstream" block listing each gate with its owner.

**Example output block:**
```
---
Before this goes downstream, a human needs to verify:

☐ Factual verification (Practitioner) — Every specific claim, statistic, and attribution independently confirmed.
☐ Context integrity (Practitioner) — Output retains brief specifics, not generic advice. Compare against original brief.
☐ Brand voice alignment (Practice Leader) — Output sounds like this client. Compare against brand package.
☐ Legal / compliance (Practice Leader) — Checked for exposure where applicable.
☐ Originality (Practitioner) — No reproduced copyrighted material or closely mirrored published work.
---
```

---

## Part 3: Step 6 Dependency Notes

The following must be preserved in the Step 6 spec. The dashboard cannot be built correctly without this context.

### What Step 6 Must Know About the Data Layer

**Step 6 is a visualization layer, not a data model.** All the underlying data it needs exists after Step 4 is complete. Do not invent a new data model in Step 6.

**Data sources for the Step 6 dashboard:**

| Metric | Source |
|---|---|
| Workflows identified (total) | Count of all Capability Records in Sanity |
| Classification breakdown (AI-Led / AI-Assisted / Human-Led / Not Evaluated) | `aiClassification` + `status` fields on Capability Records |
| Proven Status count and percentage | `provenStatus` flag on Capability Records + linked methodologies |
| Methodology coverage (% with a linked methodology) | Count of Capability Records where `linkedMethodology` is populated |
| Practice-by-practice progress | All of the above, filtered by `practiceArea` |
| Production time improvement | `baselineProductionTime` vs `aiNativeProductionTime` on Capability Records |
| MCP usage (who's querying, what) | `alexandria_request_log` table (built in Step 3) |
| Unidentified deliverable type volume | Records logged via `alexandria_log_capability_gap` |

**Chance's executive view should answer:**
- How many deliverable types have we identified?
- What percentage are classified?
- What percentage have methodologies built?
- What percentage have reached Proven Status?
- What's the breakdown by practice area?
- Where is the transformation moving fastest and slowest?

**Practice leader view should answer:**
- Status of their practice's deliverable types
- Which methodologies are at Proven Status
- Production time improvement data for their practice
- MCP usage within their practice (how often practitioners are using Alexandria, for what)

### Step 6 Updated Scope

Replace the current Step 6 spec with the following:

---

### Step 6: Dashboards and Measurement Layer

Wire up the measurement infrastructure for the transformation. This step is a visualization and reporting layer — the data model was established in Steps 3 and 4.

**Data available by the time Step 6 is built:**
- `alexandria_request_log` (Step 3) — all MCP activity, by user, tool, practice
- Capability Records (Step 4) — full deliverable taxonomy with status, classification, proven status, production time data
- `capability_gap_log` (Step 4) — unsupported requests and unidentified deliverable types

**Build:**
- Executive dashboard (Chance view): transformation progress metrics — workflows identified, classification coverage, proven status progression, practice-by-practice breakdown. Sourced from Capability Records.
- Practice leader dashboard: their practice slice of the Capabilities Matrix plus MCP usage data for their team. Filtered view of the same data.
- Admin dashboard (Brandon): full platform view — all of the above plus request log volume, unsupported request patterns, capability gap trends.
- n8n: background data routing as needed (Fireflies transcripts, Asana activity). First workflow TBD based on what's actually needed by the time Step 6 is built.

**Metrics that matter (defined in discovery):**

*Primary:*
- Production time reduction by deliverable type (before/after from Capability Records)
- Proven Status progression (how much of JDA's production surface area is validated AI-native)

*Secondary:*
- MCP usage volume by practice and practitioner (leading indicator of adoption)
- Classification coverage (% of identified workflows that have been evaluated)
- Revision rate comparison (AI-native vs. legacy — requires manual input, may be deferred)

*Executive (Chance):*
- Blended production time reduction across agency (target: 50% at 6 months)
- Proven Status count and practice distribution
- Revenue pipeline implications (requires BD input — likely manual at first)

**Open questions (still to resolve before building):**
- Is Asana API integration worth building for adoption tracking, or is MCP request log sufficient?
- What does the first n8n workflow actually look like?
- Does practice leader dashboard need write capability (logging production time, marking proven status) or is it read-only?

**Depends on:** Steps 3 and 4 complete. Capability Records seeded and partially evaluated through at least two Discovery Intensives.

---

## Implementation Notes for Cursor

### Build order within Step 4

1. **Methodology schema updates first** (Part 2) — add `aiClassification`, `provenStatus`, `qualityChecklist`, `baselineProductionTime` fields to the existing methodology schema. Update `alexandria_get_methodology` MCP response to include these fields. Update the quality checklist surface behavior in Claude's methodology response.

2. **Capability Record schema** — add the `capabilityRecord` document type to Sanity. No MCP tools yet.

3. **Seed initial data** — load the KIRU case study deliverable inventory as `not_evaluated` Capability Records. This is a script, not a manual Sanity Studio operation. Source field: `kiru_case_study`.

4. **MCP tools** — `alexandria_get_capability`, `alexandria_list_capabilities`, `alexandria_update_capability` (practice_leader+), `alexandria_log_capability_gap`.

5. **Portal Capabilities Matrix page** — filterable table view of all Capability Records. Admin sees all practices. Practice leaders see their practice. Inline status updates. Links to Sanity Studio for full record editing.

6. **Human-Led methodology authoring** — this is content work, not code. Priority order: video production, logo production, brand discovery sessions, crisis communications. These need to exist before Human-Led records can advance to `methodology_built`.

### What does NOT need to be built in Step 4

- The executive dashboard — that is Step 6.
- `assemble_production_context` — still deferred.
- Asana integration — still Step 6 or later.
- Campaign Brief and Client Proposal templates — still pending discovery (Step 2 carry-forward).

---

*Discovery session: March 30, 2026. Participants: Brandon Travis.*
*This document supersedes the original Step 4 placeholder in the implementation plan.*
