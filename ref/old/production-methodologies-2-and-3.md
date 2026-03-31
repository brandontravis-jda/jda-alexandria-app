# Production Methodology #2: Post-Discovery Brief

---

### Metadata

| Field | Value |
|---|---|
| **name** | Post-discovery brief |
| **slug** | `post_discovery_brief` |
| **practice** | Agency-Wide (Dev/Digital Experience origin, applicable to any practice with client discovery) |
| **ai_classification** | AI-Led |
| **proven_status** | false (in validation) |
| **author** | Brandon |
| **tools_involved** | Claude |

### Description

Produces a comprehensive project brief immediately after a client discovery meeting. Claude locks validated decisions, documents what changed from pre-discovery hypotheses, and produces a single document that replaces the build spec, site architecture doc, copy brief, and internal alignment deck. The output is a professional HTML document ready to hand directly to a design team or share with the client for sign-off before design begins.

### Required Inputs

| Input | Type | Required | Description | How Claude asks |
|---|---|---|---|---|
| Client name | Text | Yes | The name of the client | "What's the client name?" |
| Discovery notes | Text / File | Yes | Everything from the discovery meeting — notes, transcripts, whiteboard photos, voice memo transcripts, bullet points. Messy is fine. | "Give me everything from the discovery meeting. Notes, transcripts, whiteboard photos, voice memos — even messy bullet points work. The more raw material I have, the stronger the brief." |
| Pre-discovery brief | File | No | If a pre-discovery brief was produced, include it. Claude will use the delta between pre and post as a structural element. | "Did we run a pre-discovery brief before this meeting? If so, attach or paste it — I'll document what changed and what held up." |
| Decisions made | Text | No | Any specific decisions that were confirmed in the meeting | "Were there any specific decisions locked in the meeting? Things the client confirmed, directions they chose, options they rejected?" |
| Supporting documents | File | No | Any materials shared during or after discovery — strategy docs, brand standards, existing content, competitor examples | "Did the client share any documents during or after discovery? Brand guidelines, strategy docs, existing content — anything that came up in the meeting." |

### System Instructions

```
You are producing a post-discovery brief for a JDA Worldwide client engagement. This is the single source of truth document for the project. It replaces the build spec, site architecture doc, copy brief, and internal alignment deck. One document, not four.

This document must be conclusive. It documents decisions, not options. Where the discovery meeting resolved a question, the brief states the answer. Where a question remains open, the brief flags it explicitly as unresolved. The design team should be able to pick this up and begin work without scheduling another meeting.

METHODOLOGY:

1. SYNTHESIZE DISCOVERY
   Read everything provided — notes, transcripts, documents, decisions. Extract every material piece of information: what was said, what was decided, what was debated, what was left unresolved.

2. DOCUMENT THE DELTA (if pre-brief exists)
   Compare against the pre-discovery brief. For every hypothesis in the pre-brief:
   - VALIDATED: hypothesis confirmed. State what confirmed it.
   - OVERTURNED: hypothesis was wrong. State what replaced it and why.
   - REFINED: hypothesis was partially right. State what changed and what held.
   - UNTESTED: hypothesis wasn't discussed. Flag for follow-up.
   
   This delta section is often the most valuable strategic insight of the entire engagement. It shows the gap between what we assumed and what's true.

3. LOCK THE SITE ARCHITECTURE
   Based on everything learned in discovery, produce the confirmed page structure.
   - Every page has a name, URL slug, primary purpose, and target audience
   - Flag any pages that are confirmed vs. still tentative
   - Note dependencies between pages (e.g., "services pages depend on finalizing the service taxonomy")
   - Include content requirements for each page — what needs to exist, not what it says yet

4. BUILD THE DECISION LOG
   Every material call made in discovery, documented with:
   - The decision itself (specific, unambiguous)
   - Who made it (client, JDA, mutual)
   - The design or content implication (what this means for the build)
   - Any conditions or caveats

5. DEFINE THE AUDIENCE HIERARCHY
   Who the site is for, ranked by priority. For each audience:
   - Who they are
   - What their job-to-be-done is on the site
   - What they need to feel
   - What action they should take
   The ranking matters. When design or content decisions conflict between audiences, the higher-ranked audience wins.

6. WRITE THE CONTENT STRATEGY
   What content the site needs and how it maps to the client's marketing goals.
   - Content types (case studies, blog posts, resource library, etc.)
   - Content priorities (what must exist at launch vs. what's Phase 2)
   - Content sources (what the client provides, what JDA creates, what's repurposed)
   - SEO or discoverability considerations if relevant

7. PRODUCE REFINED COPY SEEDS
   Updated from the pre-brief (if one existed) based on what was learned. For every major section:
   - Headline direction
   - Positioning language
   - Tone and voice notes
   - Key messages that must appear
   These are specific enough that a copywriter can react to them rather than start from scratch.

8. SEQUENCE NEXT STEPS
   What happens after this brief is approved, in order:
   - What happens first
   - What runs in parallel
   - What can't start until something else is done
   - Who owns each step
   - Any deadlines or dependencies flagged in discovery

OUTPUT FORMAT:
- Single HTML file, fully styled
- Use the client's brand colors and typography if identifiable; otherwise use a clean, professional palette
- Professional enough to send to the client for sign-off before design begins
- Clear section headers matching the methodology above
- Decision log formatted as a scannable table
- Architecture formatted as a visual hierarchy or structured list, not a paragraph

IMPORTANT BEHAVIORAL INSTRUCTIONS:
- This document produces conclusions, not options. The instruction "ready to hand directly to a design team — not a starting point for more discussion" is the core operating principle. If something was decided, state the decision. If something wasn't decided, flag it as open and state what needs to happen to resolve it.
- The delta section (pre-brief vs. post-brief) is not optional when a pre-brief exists. It is often the most strategically valuable section of the entire document.
- Copy seeds must reflect what was learned in discovery, not generic marketing language. If the client said "we want to sound authoritative but not corporate," the copy seeds must demonstrate that specific tone — not just note it.
- The audience hierarchy must be ranked. "Everyone" is not an audience. If the client said their site is for "donors, volunteers, and program participants," the brief must state which of those three takes priority when design decisions conflict.
```

### Steps

| Step | Name | Instructions | Approval Gate | Gate Prompt | Iteration Protocol |
|---|---|---|---|---|---|
| 1 | Collect inputs | Ask for required inputs. Confirm what's been provided. If no pre-brief exists, note that the delta section will be skipped. | No | — | — |
| 2 | Synthesize and produce | Execute the full methodology. Produce the complete HTML brief. | No | — | — |
| 3 | Deliver and iterate | Present the completed brief. Ask if anything needs adjustment before it goes to the design team or client. | Yes | "Here's your post-discovery brief. This is meant to be the handoff document to design — everything they need to start work. Take a look: are there any decisions I captured wrong, anything missing from the meeting, or areas where you want me to go deeper?" | Open-ended feedback. Practitioner directs changes in natural language. Claude implements and re-delivers. |

### Output Format

Single HTML file. Fully styled with the client's brand system if identifiable. Professional presentation quality — ready to send to the client for sign-off or hand to a design team as the project source of truth. Decision log as a scannable table. Architecture as a structured hierarchy. All sections present with clear headers.

### Quality Checks

| Check | Description | Internal Prompt |
|---|---|---|
| Decision completeness | Does the decision log capture every material call from the notes? | "Review the discovery notes against the decision log. Is there any decision, direction, or confirmed choice from the meeting that isn't captured in the log? Flag any gaps." |
| Delta accuracy | If a pre-brief exists, is every hypothesis accounted for? | "Compare the pre-brief hypotheses against the delta section. Is every hypothesis marked as validated, overturned, refined, or untested? Flag any hypothesis that was silently dropped." |
| Actionability test | Could a designer start work from this document without scheduling another meeting? | "Read this brief as if you're a designer who wasn't in the discovery meeting. Can you begin design work from this document alone? Flag every place where you'd need to ask a question before proceeding." |
| Audience ranking | Is the audience hierarchy actually ranked, with clear priority? | "Check the audience hierarchy. Are audiences ranked by priority? Is it clear which audience wins when design decisions conflict? If the ranking is vague or absent, flag it." |
| Open items flagged | Are unresolved questions explicitly flagged, not papered over? | "Identify every place in the brief where a question remains open. Verify each one is explicitly flagged as unresolved with a clear statement of what needs to happen to resolve it. Flag any open question that's presented as if it's been decided." |
| Copy seed specificity | Do copy seeds reflect the actual client voice from discovery, not generic marketing language? | "Read each copy seed. Does it reflect something specific from the discovery — the client's actual language, their stated tone preferences, their positioning? Flag any copy seed that could appear unchanged in a brief for a different client." |

### Failure Modes

| Failure Mode | Description | Mitigation |
|---|---|---|
| Options instead of decisions | Brief presents "the client could do X or Y" when the meeting actually decided on X. Discovery briefs that present options instead of conclusions waste everyone's time. | Every section must state conclusions where they exist. Options are only acceptable when the meeting genuinely left something unresolved — and those must be flagged with a resolution path. |
| Missing the delta | If a pre-brief exists and the post-brief doesn't document what changed, the most valuable strategic insight is lost. | The delta section is mandatory when a pre-brief exists. Every hypothesis must be accounted for. This is not a summary — it's an analytical comparison. |
| Generic copy seeds | Copy seeds that say "empowering communities through innovation" instead of reflecting the client's actual language and positioning from the meeting. | Copy seeds must be traceable to something the client said or something the discovery revealed. Pull actual language from the notes where possible. |
| Architecture without rationale | A page list with no explanation of why each page exists or what it's meant to do. | Every page in the architecture must have a stated purpose and target audience. "Because most websites have a blog" is not a rationale. |
| Buried open questions | Unresolved items hidden inside other sections instead of collected and flagged prominently. | Open questions get their own section. They must be specific ("Does the client want a members-only portal?"), not generic ("What are the client's digital goals?"). Each must include what needs to happen to resolve it. |

### Vision of Good

A strong post-discovery brief eliminates the "that's not what I meant" conversation six weeks into design. The design team picks it up and knows exactly what they're building, for whom, and why. The client reads it and says "yes, that's what we discussed" — or flags the specific things that need correction before design begins.

The delta section (when a pre-brief exists) is the strategic centerpiece. It shows the team — and the client — the gap between assumptions and reality. It demonstrates that JDA doesn't just ask questions; it comes in with a point of view and refines it based on evidence. That's the positioning: the agency that does its homework.

### Tips

- Run this prompt while the meeting is still fresh. Same day is ideal. The quality degrades with every day of delay as details fade.
- Feed it everything. Voice memo transcripts, messy notes, bullet points from a whiteboard photo — Claude can synthesize chaotic inputs. Don't clean up your notes first; that takes longer than letting Claude sort through the mess.
- If a pre-brief was produced, explicitly mention it: "We ran a pre-brief before this meeting — here's what we hypothesized, here's what we learned." Claude will use the delta as a structural element of the document.
- This document is also the client alignment artifact. Sending it to the client for sign-off before design begins eliminates the most expensive category of project failure: misalignment discovered after design is underway.

### Client Refinements

None yet.

---
---

# Production Methodology #3: Client Strategy Brief

Built from Joe's Prompt Guide, Template 01. Validated and expanded into a full production methodology.

---

### Metadata

| Field | Value |
|---|---|
| **name** | Client strategy brief |
| **slug** | `client_strategy_brief` |
| **practice** | Agency-Wide (applicable to BD, Account Services, StratComm, and any strategic engagement) |
| **ai_classification** | AI-Assisted |
| **proven_status** | false (in validation — methodology adapted from Joe's prompt guide, not yet validated through gatekeeper model) |
| **author** | Joe (original template), Brandon (methodology expansion) |
| **tools_involved** | Claude |

### Description

Produces a concise strategic brief for a client engagement — a tight, executive-level document that assesses the situation, makes a recommendation, acknowledges trade-offs, and identifies the metric that proves it worked. Used when a practitioner needs to frame a strategic recommendation for a client, prepare for a strategy presentation, or produce a written brief for a CMO-level audience. This is not a discovery brief or a project spec — it's a strategic argument.

### Required Inputs

| Input | Type | Required | Description | How Claude asks |
|---|---|---|---|---|
| Client name | Text | Yes | The client this brief is for | "Which client is this for?" |
| Industry | Text | Yes | The client's industry or sector | "What industry or sector are they in?" |
| Challenge | Text | Yes | The problem or opportunity the brief is addressing | "What's the challenge or opportunity you're addressing? A sentence or two is fine — I'll ask follow-up questions if I need more." |
| Known constraints | Text | No | Budget, timeline, stakeholder dynamics, political considerations, or any other constraints that shape the recommendation | "Are there any constraints I should know about? Budget, timeline, stakeholder dynamics, political considerations — anything that limits what can be recommended." |
| Audience | Text | No | Who will read this brief and what they care about. Defaults to CMO-level if not specified. | "Who's reading this brief? A CMO, a board, an internal team? Knowing the audience helps me calibrate the tone and what to emphasize." |
| Supporting context | File / Text | No | Any background materials — previous strategy docs, performance data, competitive intel, meeting notes | "Do you have any background materials I should review? Previous strategy docs, performance data, competitive intel — anything that gives me more context." |

### System Instructions

```
You are producing a client strategy brief for JDA Worldwide. This is an executive-level strategic document — tight, direct, and decisive. It makes an argument, not a presentation. It leads with the conclusion, not the setup.

VOICE AND TONE:
- Write as a senior strategist, not a consultant. The difference: a strategist says what to do and why. A consultant presents options and lets the client decide.
- No hedging language: "it seems," "might," "could potentially" — cut all of it. If you're uncertain, say so directly rather than hedging.
- No bullet points unless absolutely necessary. This is executive prose.
- No filler. No throat-clearing. No "in today's rapidly evolving landscape." Lead with the insight.
- Tight. The entire brief should be under 400 words. Constraint creates quality.

METHODOLOGY:

1. SITUATION ASSESSMENT
   What's true right now. Not background — the specific current reality that makes this brief necessary. What's at risk, what's changing, what the client is facing. Two to three sentences maximum. If you can't state the situation in three sentences, you don't understand it well enough.

2. STRATEGIC RECOMMENDATION
   What to do and why. This is the core of the brief. It must be:
   - Specific enough to act on (not "improve digital presence" but "rebuild the site on a modern stack with AI-native content production to cut time-to-market by 60%")
   - Grounded in the situation assessment (the recommendation responds to the specific reality, not a generic best practice)
   - Opinionated — JDA has a point of view, and this brief expresses it

3. KEY TRADE-OFFS
   What this approach costs. Every strategic recommendation has trade-offs — budget implications, timeline constraints, organizational change required, what you're choosing NOT to do. Acknowledging them builds credibility. Hiding them destroys it.
   - Two to three trade-offs maximum
   - Each must be honest, not a disguised benefit ("the trade-off is that you'll grow faster" is not a trade-off)

4. SUCCESS METRIC
   One metric that would prove this recommendation worked. Not a dashboard of KPIs — one number. This forces precision about what success actually looks like for this specific recommendation.

OUTPUT FORMAT:
- Clean, structured prose document
- Four sections matching the methodology: Situation, Recommendation, Trade-offs, Metric
- No additional headers beyond these four
- Under 400 words total
- If the practitioner specified an audience, calibrate formality and emphasis accordingly (a board sees different framing than an internal team)

IMPORTANT BEHAVIORAL INSTRUCTIONS:
- The 400-word constraint is not a suggestion. It forces the strategist to prioritize. A brief that runs long is a brief that hasn't decided what matters most.
- The recommendation must be traceable to the situation. If the situation section talks about declining organic traffic, the recommendation better address organic traffic — not pivot to a brand refresh.
- The success metric must be measurable. "Improved brand perception" is not a metric. "Brand awareness survey score moving from 34% to 50% in the target segment within 12 months" is a metric.
- If the practitioner provided constraints, the recommendation must operate within them. A recommendation that ignores a stated $50K budget to propose a $200K engagement is a failure.
```

### Steps

| Step | Name | Instructions | Approval Gate | Gate Prompt | Iteration Protocol |
|---|---|---|---|---|---|
| 1 | Collect inputs | Ask for required inputs. If the challenge description is thin, ask one or two follow-up questions to understand the situation before writing. | No | — | — |
| 2 | Produce brief | Execute the methodology. Deliver the complete brief under 400 words. | Yes | "Here's the strategy brief. Is the recommendation landing the way you'd want it to? Anything I should sharpen, reframe, or adjust before this goes to the client?" | Open-ended feedback. Practitioner directs changes. Claude iterates. |

### Output Format

Clean prose document. Four sections: Situation, Recommendation, Trade-offs, Metric. No additional headers. Under 400 words. Professional enough to send to a CMO. Can be delivered as plain text in Claude, as a formatted document, or dropped into a presentation deck.

### Quality Checks

| Check | Description | Internal Prompt |
|---|---|---|
| Word count | Is the brief under 400 words? | "Count the words in the brief. If it exceeds 400, identify what can be cut without losing the argument." |
| Recommendation specificity | Is the recommendation specific enough to act on? | "Read the recommendation. Could a client forward this to their team and have them begin execution? If not, it's too vague. Identify what needs to be more specific." |
| Situation-recommendation alignment | Does the recommendation directly respond to the stated situation? | "Does the recommendation directly address the reality described in the situation section? If the situation talks about X and the recommendation addresses Y, flag the disconnect." |
| Constraint compliance | If constraints were provided, does the recommendation respect them? | "If the practitioner provided budget, timeline, or other constraints, verify the recommendation operates within them. Flag any violation." |
| Hedging language | Is the prose direct and decisive? | "Scan the brief for hedging: 'might,' 'could,' 'it seems,' 'potentially,' 'it may be worth considering.' Flag every instance. Replace with direct statements or honest uncertainty." |
| Metric measurability | Is the success metric actually measurable? | "Can the stated success metric be measured with a number at a specific point in time? If it's vague ('improved engagement'), flag it and suggest a measurable alternative." |

### Failure Modes

| Failure Mode | Description | Mitigation |
|---|---|---|
| Consultant mode | Brief presents options instead of making a recommendation. "You could do A or B" instead of "Do A because..." | The brief must make a single recommendation and defend it. If there are genuinely two viable paths, pick one and explain why, then acknowledge the alternative as a trade-off. |
| Generic strategy language | "Leverage your brand equity to drive digital transformation" — language that sounds strategic but says nothing specific to this client. | Every sentence must be traceable to something specific about this client, their situation, or their constraints. If a sentence could appear unchanged in a brief for a different client, cut it. |
| Recommendation exceeds constraints | The brief proposes something the client can't do given their stated budget, timeline, or organizational reality. | Read the constraints before writing. If the recommendation requires resources beyond the constraints, either scope it differently or explicitly address why the constraint should be reconsidered (which is a legitimate strategic argument, not an oversight). |
| Vanity metric | Success metric is something that sounds good but doesn't prove the recommendation worked — "increased social media followers" when the recommendation was about sales conversion. | The metric must directly measure the outcome the recommendation is designed to produce. Not a proxy metric. Not a vanity metric. The one number that tells you whether this worked. |

### Vision of Good

A strong client strategy brief changes the meeting. Instead of a rambling strategy presentation with 40 slides, the client gets a one-page document that says: here's what's happening, here's what to do about it, here's what it costs you, and here's how we'll know it worked. The client either agrees and you move forward, or they push back on specific points — which is equally productive because now you're debating substance, not process.

The brevity is the point. A strategist who can't express the recommendation in 400 words hasn't done the thinking. The constraint forces clarity about what actually matters.

### Tips

- This methodology works for internal strategy recommendations too, not just client-facing briefs. Swap the audience context accordingly.
- If the practitioner says "I don't know the constraints," that's useful information. The brief should note that constraints are undefined and flag the risk: a recommendation without constraints may propose something the client can't execute.
- The trade-offs section is where trust is built. Clients know every recommendation has downsides. A brief that acknowledges them honestly is more persuasive than one that pretends they don't exist.
- This pairs naturally with the pre-discovery brief methodology. The pre-discovery brief produces the research; the strategy brief distills it into a recommendation. Different deliverables, complementary workflows.

### Client Refinements

None yet.

---

*These two methodologies, combined with the pre-discovery brief (Reference Methodology #1), constitute the proof of concept set for the platform. Three methodologies covering three different use cases: research-heavy brief generation (pre-discovery), synthesis and decision documentation (post-discovery), and concise strategic argument (client strategy brief). Together they validate the schema, the MCP interaction model, and the system-level context pattern.*
