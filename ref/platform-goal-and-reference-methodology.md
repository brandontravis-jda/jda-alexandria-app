# JDA AI-Native Platform — What We're Building

---

## The Goal

The platform makes Claude operationally intelligent for JDA. When a practitioner opens Claude and says "I need to produce a pre-discovery brief for Acme Corp," Claude already knows how JDA produces pre-discovery briefs — the methodology, the required inputs, the output format, the quality checks, the failure modes. Claude asks the practitioner for what it needs, executes the methodology, and delivers a JDA-quality deliverable. The practitioner never sees the underlying prompt, framework, or production logic. They experience a smart, methodology-aware assistant that produces work the JDA way.

The platform achieves this by storing **production methodologies** — complete operating instructions for every deliverable type JDA produces AI-natively. These methodologies are authored and maintained by a small group (Brandon, practice leaders, NewCo team) through the portal, stored in Sanity, and served to Claude through an MCP server. The MCP server returns methodologies as system-level context that Claude absorbs and executes — never as content displayed to the practitioner.

This is the IP protection layer. The methodology — the sequencing, the specific questions, the quality checks, the iteration protocols, the output structures — lives in the platform and never surfaces to the end user. A practitioner who leaves JDA doesn't walk out with a prompt library they can paste into another tool. They walk out with the memory that Claude produced great work. The *how* stays in the system.

The capabilities matrix maps every deliverable type JDA produces and classifies each by AI role (AI-Led, AI-Assisted, Human-Led). The platform's job is to build a production methodology for every AI-eligible deliverable on that matrix. Today, we need three or four that work as a proof of concept. Through discovery with each practice leader, the goal is to produce methodologies for every eligible deliverable across every practice — potentially a hundred or more.

Each methodology goes through the same lifecycle: authored during discovery → validated through production → reaches Proven Status after three successful client deliveries → becomes the mandatory default production method for that deliverable type.

---

## What a Production Methodology Contains

A production methodology is a complete set of operating instructions that Claude uses to produce a specific deliverable type. It is never shown to the practitioner. Claude reads it, understands it, and acts on it.

### Schema

| Field | Type | Description |
|---|---|---|
| **name** | Text | What practitioners ask for. Plain language: "pre-discovery brief," "press release," "campaign brief." This is how Claude matches a request to a methodology. |
| **slug** | Text | Machine-readable identifier: `pre_discovery_brief`, `press_release`, `campaign_brief`. Used in MCP tool calls. |
| **deliverable_type** | Reference | Link to the capabilities matrix entry for this deliverable. |
| **practice** | Reference | Which practice owns this methodology, or "Agency-Wide" for cross-practice methodologies. |
| **ai_classification** | Enum | AI-Led, AI-Assisted, or Human-Led. Determines how Claude frames its role. |
| **description** | Text | One-paragraph summary of what this methodology produces and when to use it. Used by Claude to confirm it matched the right methodology to the request. |
| **required_inputs** | Array | Structured list of what Claude must collect from the practitioner before executing. Each input has: `name`, `type` (text / URL / file / selection), `required` (boolean), `description` (what it is and why it matters), `prompt_text` (how Claude should ask for it). |
| **system_instructions** | Rich Text | The core methodology. The actual prompt/framework Claude uses to produce the deliverable. This is the IP. Never displayed to the user. May contain multiple prompt blocks for multi-step workflows. |
| **steps** | Array | For multi-step workflows: ordered sequence of steps. Each step has: `name`, `instructions` (what Claude does), `approval_gate` (boolean — does Claude pause for practitioner feedback?), `gate_prompt` (how Claude asks for approval/feedback), `iteration_protocol` (how feedback is structured — e.g., KEEP/CHANGE/ADD). For single-step methodologies, this is one step with no approval gate. |
| **output_format** | Text | What the deliverable looks like: HTML document, markdown, structured data, Word doc, etc. Includes formatting instructions. |
| **quality_checks** | Array | What Claude self-checks before delivering. Each check has: `name`, `description`, `check_prompt` (the internal prompt Claude runs to verify). Maps to the QA framework dimensions where applicable. |
| **failure_modes** | Array | Common ways this deliverable goes wrong. Each has: `name`, `description`, `mitigation` (what Claude does to avoid it). These are loaded as negative constraints. |
| **vision_of_good** | Rich Text | Example output or description of what excellent looks like. System-level — used by Claude for calibration, not shown to the practitioner. |
| **tips** | Rich Text | Additional operational context for Claude. Edge cases, client-specific considerations, things that improve output quality. |
| **tools_involved** | Array | Which tools are used: Claude, Cursor, v0, Midjourney, etc. For multi-tool workflows, maps to specific steps. |
| **proven_status** | Boolean | Has this methodology been shipped to clients three times through the gatekeeper model? |
| **proven_date** | Date | When Proven Status was achieved. |
| **author** | Reference | Who created this methodology. |
| **validated_by** | Reference | Practice leader who validated output quality. |
| **version** | Number | Auto-incremented on edit. |
| **client_refinements** | Array | Client-specific adjustments that modify the base methodology. Each has: `client` (reference), `refinement_text` (what changes for this client), `context` (why). These are layered on top of the base methodology when a practitioner specifies a client. |

### MCP Interaction Model

1. Practitioner: "I need to do a pre-discovery brief for Acme Corp"
2. Claude calls `get_production_methodology("pre_discovery_brief")` — or Claude infers the right methodology from natural language and calls `match_methodology("website pre-discovery brief")`
3. MCP server returns the full methodology with a `context_type: "system"` flag — Claude absorbs it as operating instructions, does not display it
4. Claude reads `required_inputs`, identifies what it needs, and asks the practitioner in natural language
5. Practitioner provides inputs (client name, URL, files, context)
6. Claude executes `system_instructions`, following `steps` in order
7. At each `approval_gate`, Claude pauses and asks for feedback using the defined `gate_prompt` and `iteration_protocol`
8. Before delivering, Claude runs `quality_checks` internally
9. Claude delivers the output in the specified `output_format`
10. If the practitioner specified a client that has `client_refinements`, those are layered on top of the base methodology before execution

---

## Reference Methodology #1: Pre-Discovery Brief

This is the first complete production methodology, built from Brandon's Discovery Prompt Playbook. It serves as the reference object that everything else is designed around.

---

### Metadata

| Field | Value |
|---|---|
| **name** | Pre-discovery brief |
| **slug** | `pre_discovery_brief` |
| **practice** | Agency-Wide (Dev/Digital Experience origin, applicable to any practice with client discovery) |
| **ai_classification** | AI-Led |
| **proven_status** | false (in validation) |
| **author** | Brandon |
| **tools_involved** | Claude |

### Description

Produces a comprehensive research brief before a client discovery meeting. Claude researches the client, audits their current site, analyzes competitors, and generates testable hypotheses — so the practitioner walks into discovery already knowing what they think, not asking "tell us about yourself." The output is a professional HTML document that can be shared with the team or the client directly.

### Required Inputs

| Input | Type | Required | Description | How Claude asks |
|---|---|---|---|---|
| Client name | Text | Yes | The name of the client or prospect | "What's the client or prospect name?" |
| Website URL | URL | Yes | The client's current website | "What's their website URL?" |
| Supporting documents | File | No | Any existing materials — proposals, RFPs, brand standards, meeting notes, call transcripts. Even messy or partial documents improve output significantly. | "Do you have any existing documents I should review? Proposals, brand standards, meeting notes, old RFPs — anything you have, even if it's rough. The more context I have, the more specific the brief will be." |
| Specific concerns or focus areas | Text | No | Anything the practitioner already knows or suspects about the client's needs | "Is there anything specific you already know or suspect about what they need? Any particular areas you want me to focus on?" |

### System Instructions

```
You are producing a pre-discovery brief for a JDA Worldwide client engagement. This brief is your primary deliverable. It must be comprehensive enough that the practitioner walks into the discovery meeting with confident, testable hypotheses — not generic questions.

METHODOLOGY:

1. RESEARCH THE CLIENT
   - Company intelligence: what they do, who they serve, how they position themselves, their market, their scale
   - Leadership and organizational context if discoverable
   - Recent news, press, or notable activity
   - Their stated mission, values, and positioning language

2. AUDIT THE CURRENT SITE
   - Overall assessment: design quality, content quality, information architecture
   - What's working well and should be preserved
   - What's broken, outdated, or missing
   - How the site serves (or fails to serve) their apparent business goals
   - Technical observations: platform, performance, mobile experience, SEO basics
   - Content gaps: what a visitor would expect to find but can't

3. COMPETITIVE ANALYSIS
   - Identify 2-3 direct competitors or comparable organizations
   - How each positions themselves relative to the client
   - What competitors do better on the web
   - What the client does better
   - Opportunities the competitive landscape reveals

4. GENERATE TESTABLE HYPOTHESES
   - These are specific, confident bets about what the site needs to do — not generic "improve SEO" recommendations
   - Each hypothesis should be framed as a statement the discovery meeting can validate or overturn
   - Ground each hypothesis in something specific from the research, audit, or competitive analysis
   - Aim for 5-8 hypotheses that cover strategy, content, architecture, and design

5. PROPOSE SITE ARCHITECTURE
   - A starting page structure based on the research
   - This is a hypothesis to validate in discovery, not a final architecture
   - Include rationale for major structural decisions
   - Flag any architectural decisions that depend on information you don't have yet

6. WRITE TARGETED DISCOVERY QUESTIONS
   - These must be specific to what you actually found — not generic discovery questions
   - Each question should be traceable to a gap in your research, an untested hypothesis, or a decision that requires client input
   - Organize by theme or priority
   - 15-20 questions maximum

7. DRAFT COPY SEEDS
   - Early headline and positioning directions based on the research
   - These are starting points for the practitioner to react to in the meeting — not final copy
   - Ground them in the client's actual language, mission, and positioning where possible

OUTPUT FORMAT:
- Single HTML file, fully styled
- Use the client's brand colors if identifiable from their site; otherwise use a clean, professional palette
- Professional enough to share with the client directly if needed
- Clear section headers matching the methodology above
- Confidence indicators: flag anything that is inference vs. verified fact

IMPORTANT BEHAVIORAL INSTRUCTIONS:
- Be specific. Generic observations ("the site could use better UX") are worthless. Say exactly what's wrong and what should change.
- Be honest about confidence levels. If you're inferring something, say so. If you couldn't find something, say that too.
- The hypotheses are the most valuable part of this brief. They're what turns a 90-minute discovery session into a 45-minute confirmation meeting. Make them sharp.
- The discovery questions are the second most valuable part. They should make the practitioner feel like they've already done their homework — because they have.
```

### Steps

| Step | Name | Instructions | Approval Gate | Gate Prompt | Iteration Protocol |
|---|---|---|---|---|---|
| 1 | Collect inputs | Ask for required inputs. Confirm what's been provided. Note what's missing and whether it's needed or optional. | No | — | — |
| 2 | Research and analysis | Execute the full methodology: research, audit, competitive analysis, hypotheses, architecture, questions, copy seeds. Produce the complete HTML brief. | No | — | — |
| 3 | Deliver and iterate | Present the completed brief. Ask if the practitioner wants to review it before the meeting or if anything needs adjustment. | Yes | "Here's your pre-discovery brief. Take a look — is there anything you'd like me to adjust before your meeting? Any hypotheses that feel off, questions you'd add or remove, or areas you want me to dig deeper on?" | Open-ended feedback. Practitioner directs changes in natural language. Claude implements and re-delivers. |

### Output Format

Single HTML file. Fully styled with the client's brand colors if identifiable. Professional presentation quality — ready to open in a browser, share as a link, or export as a PDF. All sections present with clear headers. Confidence indicators on hypotheses and inferred information.

### Quality Checks

| Check | Description | Internal Prompt |
|---|---|---|
| Confident wrongness | Are any claims stated as fact that could be wrong? | "Review every specific claim in this brief — company details, competitor information, market assertions. Flag anything you stated with confidence that you should have flagged as uncertain or unverified." |
| Specificity test | Are the hypotheses and questions specific to this client, or could they apply to anyone? | "Read each hypothesis and each discovery question. If it could appear unchanged in a brief for a completely different client, it's too generic. Flag and replace." |
| Context retention | If supporting documents were provided, did the brief incorporate them? | "If the practitioner provided supporting documents, verify that key information from those documents is reflected in the brief. Flag any provided context that was ignored." |
| Architecture rationale | Does every structural decision in the proposed architecture have a stated reason? | "Check each page in the proposed site architecture. Does it have a clear rationale grounded in the research? Flag any page that's included 'because websites usually have one' rather than because the research supports it." |
| Gap honesty | Are gaps and unknowns clearly flagged, not papered over? | "Identify every place in the brief where you don't have enough information to be confident. Verify that each one is explicitly flagged as a hypothesis or open question, not presented as a conclusion." |

### Failure Modes

| Failure Mode | Description | Mitigation |
|---|---|---|
| Generic hypotheses | Hypotheses that could apply to any company ("improve their SEO," "modernize the design"). Useless in a discovery meeting. | Every hypothesis must reference something specific from the research. If it can't be traced to a specific finding, cut it. |
| Surface-level audit | Audit stays at "the site looks dated" without identifying specific structural, content, or functional problems. | Audit must identify specific pages, specific content gaps, specific architectural problems. "The About page has no team section despite being a relationship-driven business" — not "the About page could be improved." |
| Research echo chamber | Brief restates what the client's own site says without adding analytical value. | The brief's value is in what the client can't see about themselves. Competitive context, market positioning gaps, structural problems they've normalized. If the brief just summarizes their About page, it failed. |
| Overconfidence on inferred information | Brief presents research-derived assumptions as confirmed facts, leading the practitioner to make false claims in the meeting. | Every piece of information is either verified (from the site, from public records) or inferred (from patterns, from competitive context). Label the difference. |
| Cookie-cutter architecture | Proposed site architecture follows a generic template rather than responding to the client's actual needs. | Architecture must be justified by the research. If the client is a B2B SaaS company, the architecture should reflect B2B SaaS patterns. If they're a nonprofit, different structure entirely. No default templates. |

### Vision of Good

A strong pre-discovery brief makes the practitioner feel overprepared. They walk into the meeting knowing:
- What the client does and who they serve (at a level of detail that surprises the client)
- What's wrong with their current site and specifically why
- How their competitors are outperforming them on the web
- What they think the site needs to do (testable hypotheses)
- What they still need to learn (targeted questions)
- What the site might say (copy seeds)

The discovery meeting shifts from "tell us about yourself" to "here's what we think — tell us where we're wrong." This is a fundamentally different meeting. It's shorter, more productive, and positions JDA as the agency that did its homework.

The output should be professional enough that a practitioner could share it with the client before the meeting as a "here's what we've learned so far — let's validate this together" artifact. Not all practitioners will do this, but the brief should be good enough that they could.

### Tips

- The more supporting documents the practitioner provides, the better the brief. A proposal, an old RFP, call notes from a BD conversation — all of it helps Claude produce specific, grounded analysis instead of generic observations from the public website alone.
- If the client's site is very thin (one-pager, minimal content), lean harder on competitive analysis and industry research to fill the brief with value.
- The HTML output format is intentional. It renders in a browser, can be shared as a link, can be exported as a PDF, and looks professional enough to send to the client directly. It's not a text dump. It's a deliverable.
- These prompts work for more than website discovery. The same methodology applies to brand strategy briefs, campaign briefs, content strategy documents. Swap "site architecture" for "campaign structure" or "brand platform" and the methodology holds.

### Client Refinements

None yet. Client-specific refinements are added as the methodology is used for specific clients. For example, a WIF refinement might include: "WIF is a faith-based nonprofit focused on sports ministry. Emphasize mission alignment and audience segmentation by ministry program in the hypotheses. The site serves both donors and program participants — architecture must account for dual audience."

---

*This is the reference methodology. Every subsequent production methodology follows this structure. The Sanity schema, MCP tool design, and practitioner experience are all built around this object.*
