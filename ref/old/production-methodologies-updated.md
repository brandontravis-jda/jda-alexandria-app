# Production Methodologies — Updated with Universal Brand Confirmation

> All three methodologies updated to include the brand confirmation step in the input collection phase. This is the universal pre-production pattern for any methodology that produces a client-facing deliverable.

---

## Universal Brand Confirmation Step

This step is executed during input collection for every client-facing methodology. It is not a separate methodology — it is a pattern embedded in Step 1 of every methodology that produces output styled for a client.

**Logic:**

1. Practitioner provides the client name
2. Claude checks Alexandria for a client brand package
3. **If found:** "I have [Client]'s brand guide on file. Should I use that, or are you working from a different or updated guide?"
4. **If not found:** "I don't have a brand guide for [Client] in our system. Do you have one you can share — a PDF, a link, anything with their colors, fonts, and visual direction? If not, I'll pull the visual direction from their current website."
5. **If practitioner provides a guide:** Use it as source of truth regardless of what's in Alexandria
6. **Fallback cascade (no guide provided, none in Alexandria):** Extract brand direction from the client's live website (primary colors, background, typography, visual feel) → If site is unavailable or unusable, use JDA house style

**In system instructions, this translates to:**

```
BRAND RESOLUTION (execute before producing any styled output):
1. Check Alexandria for a client brand package for this client
2. If found: confirm with the practitioner before using it — they may have a newer version
3. If not found: ask the practitioner if they have a brand guide to share
4. If the practitioner provides a guide (file, link, or description): use it as the source of truth
5. If no guide is available from any source: inspect the client's website and extract the visible brand system — primary color, secondary color, background treatment, heading typography, body typography, general visual feel
6. If the client's website is unavailable or too degraded to extract reliable brand direction: use JDA's house style (near-black #1A1018, red accent #ED1A3B, cream #F0EBE1, Georgia headers, Arial body)
7. Never invent a color palette. Every color in the output must come from one of these sources.
```

---
---

# Methodology #1: Pre-Discovery Brief (Updated)

### Metadata

| Field | Value |
|---|---|
| **name** | Pre-discovery brief |
| **slug** | `pre_discovery_brief` |
| **practice** | Agency-Wide |
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
| Brand guide | File / Text | No | Client's brand guide if available. Claude also checks Alexandria for an existing brand package. See Brand Resolution logic. | *(Handled by Brand Resolution step — Claude checks Alexandria first, then asks if needed)* |
| Supporting documents | File | No | Any existing materials — proposals, RFPs, brand standards, meeting notes, call transcripts. Even messy or partial documents improve output significantly. | "Do you have any existing documents I should review? Proposals, brand standards, meeting notes, old RFPs — anything you have, even if it's rough. The more context I have, the more specific the brief will be." |
| Specific concerns or focus areas | Text | No | Anything the practitioner already knows or suspects about the client's needs | "Is there anything specific you already know or suspect about what they need? Any particular areas you want me to focus on?" |

### System Instructions

```
You are producing a pre-discovery brief for a JDA Worldwide client engagement. This brief is your primary deliverable. It must be comprehensive enough that the practitioner walks into the discovery meeting with confident, testable hypotheses — not generic questions.

BRAND RESOLUTION (execute before producing any styled output):
1. Check Alexandria for a client brand package for this client
2. If found: confirm with the practitioner before using it — they may have a newer version
3. If not found: ask the practitioner if they have a brand guide to share
4. If the practitioner provides a guide (file, link, or description): use it as the source of truth
5. If no guide is available from any source: inspect the client's website and extract the visible brand system — primary color, secondary color, background treatment, heading typography, body typography, general visual feel
6. If the client's website is unavailable or too degraded to extract reliable brand direction: use JDA's house style (near-black #1A1018, red accent #ED1A3B, cream #F0EBE1, Georgia headers, Arial body)
7. Never invent a color palette. Every color in the output must come from one of these sources.

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
- Single HTML file, fully styled using the resolved brand system (see Brand Resolution above)
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

| Step | Name | Instructions | Approval Gate |
|---|---|---|---|
| 1 | Collect inputs and resolve brand | Ask for required inputs. Check Alexandria for client brand package. Confirm brand direction with practitioner per Brand Resolution logic. Confirm what's been provided and what's missing. | No |
| 2 | Research and analysis | Execute the full methodology: research, audit, competitive analysis, hypotheses, architecture, questions, copy seeds. Produce the complete HTML brief using the resolved brand system. | No |
| 3 | Deliver and iterate | Present the completed brief. Ask if the practitioner wants to review it before the meeting or if anything needs adjustment. | Yes — "Here's your pre-discovery brief. Take a look — is there anything you'd like me to adjust before your meeting? Any hypotheses that feel off, questions you'd add or remove, or areas you want me to dig deeper on?" |

### Quality Checks

| Check | Internal Prompt |
|---|---|
| Confident wrongness | "Review every specific claim in this brief — company details, competitor information, market assertions. Flag anything you stated with confidence that you should have flagged as uncertain or unverified." |
| Specificity test | "Read each hypothesis and each discovery question. If it could appear unchanged in a brief for a completely different client, it's too generic. Flag and replace." |
| Context retention | "If the practitioner provided supporting documents, verify that key information from those documents is reflected in the brief. Flag any provided context that was ignored." |
| Architecture rationale | "Check each page in the proposed site architecture. Does it have a clear rationale grounded in the research? Flag any page that's included 'because websites usually have one' rather than because the research supports it." |
| Gap honesty | "Identify every place in the brief where you don't have enough information to be confident. Verify that each one is explicitly flagged as a hypothesis or open question, not presented as a conclusion." |
| Brand compliance | "Verify that every color, font, and visual treatment in the output traces to the resolved brand source (Alexandria package, practitioner-provided guide, client website extraction, or JDA house style). Flag any color or typographic choice that was invented." |

### Failure Modes

| Failure Mode | Mitigation |
|---|---|
| Generic hypotheses | Every hypothesis must reference something specific from the research. If it can't be traced to a specific finding, cut it. |
| Surface-level audit | Audit must identify specific pages, specific content gaps, specific architectural problems — not "the site looks dated." |
| Research echo chamber | The brief's value is in what the client can't see about themselves. If it just summarizes their About page, it failed. |
| Overconfidence on inferred information | Every piece of information is either verified or inferred. Label the difference. |
| Cookie-cutter architecture | Architecture must be justified by the research. No default templates. |
| Invented brand treatment | Never invent colors or typography. Follow the Brand Resolution cascade. If no source exists, use JDA house style. |

### Vision of Good

A strong pre-discovery brief makes the practitioner feel overprepared. They walk into the meeting knowing what the client does, what's wrong with their current site, how competitors are outperforming them, what they think the site needs to do, what they still need to learn, and what the site might say. The discovery meeting shifts from "tell us about yourself" to "here's what we think — tell us where we're wrong." The brief looks like it belongs to the client — their colors, their visual world — which demonstrates that JDA did its homework before the meeting even started.

### Tips

- The more supporting documents the practitioner provides, the better the brief. A proposal, an old RFP, call notes — all of it helps.
- If the client's site is very thin, lean harder on competitive analysis and industry research.
- The HTML output format is intentional — it renders in a browser, can be shared as a link, can be exported as a PDF.
- These prompts work for more than website discovery. Swap "site architecture" for "campaign structure" or "brand platform" and the methodology holds.

---
---

# Methodology #2: Post-Discovery Brief (Updated)

### Metadata

| Field | Value |
|---|---|
| **name** | Post-discovery brief |
| **slug** | `post_discovery_brief` |
| **practice** | Agency-Wide |
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
| Brand guide | File / Text | No | Client's brand guide if available. Claude also checks Alexandria for an existing brand package. See Brand Resolution logic. | *(Handled by Brand Resolution step — Claude checks Alexandria first, then asks if needed)* |
| Pre-discovery brief | File | No | If a pre-discovery brief was produced, include it. Claude will use the delta between pre and post as a structural element. | "Did we run a pre-discovery brief before this meeting? If so, attach or paste it — I'll document what changed and what held up." |
| Decisions made | Text | No | Any specific decisions that were confirmed in the meeting | "Were there any specific decisions locked in the meeting? Things the client confirmed, directions they chose, options they rejected?" |
| Supporting documents | File | No | Any materials shared during or after discovery — strategy docs, brand standards, existing content, competitor examples | "Did the client share any documents during or after discovery? Brand guidelines, strategy docs, existing content — anything that came up in the meeting." |

### System Instructions

```
You are producing a post-discovery brief for a JDA Worldwide client engagement. This is the single source of truth document for the project. It replaces the build spec, site architecture doc, copy brief, and internal alignment deck. One document, not four.

This document must be conclusive. It documents decisions, not options. Where the discovery meeting resolved a question, the brief states the answer. Where a question remains open, the brief flags it explicitly as unresolved. The design team should be able to pick this up and begin work without scheduling another meeting.

BRAND RESOLUTION (execute before producing any styled output):
1. Check Alexandria for a client brand package for this client
2. If found: confirm with the practitioner before using it — they may have a newer version
3. If not found: ask the practitioner if they have a brand guide to share
4. If the practitioner provides a guide (file, link, or description): use it as the source of truth
5. If no guide is available from any source: inspect the client's website and extract the visible brand system — primary color, secondary color, background treatment, heading typography, body typography, general visual feel
6. If the client's website is unavailable or too degraded to extract reliable brand direction: use JDA's house style (near-black #1A1018, red accent #ED1A3B, cream #F0EBE1, Georgia headers, Arial body)
7. Never invent a color palette. Every color in the output must come from one of these sources.

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
   - Note dependencies between pages
   - Include content requirements for each page

4. BUILD THE DECISION LOG
   Every material call made in discovery, documented with:
   - The decision itself (specific, unambiguous)
   - Who made it (client, JDA, mutual)
   - The design or content implication
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
   - Content types
   - Content priorities (launch vs. Phase 2)
   - Content sources (client provides, JDA creates, repurposed)
   - SEO or discoverability considerations if relevant

7. PRODUCE REFINED COPY SEEDS
   For every major section:
   - Headline direction
   - Positioning language
   - Tone and voice notes
   - Key messages that must appear
   These are specific enough that a copywriter can react to them rather than start from scratch.

8. SEQUENCE NEXT STEPS
   What happens after this brief is approved, in order, with ownership and dependencies.

OUTPUT FORMAT:
- Single HTML file, fully styled using the resolved brand system (see Brand Resolution above)
- Professional enough to send to the client for sign-off before design begins
- Decision log formatted as a scannable table
- Architecture formatted as a visual hierarchy or structured list
- Clear section headers matching the methodology above

IMPORTANT BEHAVIORAL INSTRUCTIONS:
- This document produces conclusions, not options. If something was decided, state the decision. If something wasn't decided, flag it as open and state what needs to happen to resolve it.
- The delta section is not optional when a pre-brief exists. Every hypothesis must be accounted for.
- Copy seeds must reflect what was learned in discovery, not generic marketing language.
- The audience hierarchy must be ranked. "Everyone" is not an audience.
```

### Steps

| Step | Name | Instructions | Approval Gate |
|---|---|---|---|
| 1 | Collect inputs and resolve brand | Ask for required inputs. Check Alexandria for client brand package. Confirm brand direction with practitioner per Brand Resolution logic. If no pre-brief exists, note that the delta section will be skipped. | No |
| 2 | Synthesize and produce | Execute the full methodology. Produce the complete HTML brief using the resolved brand system. | No |
| 3 | Deliver and iterate | Present the completed brief. Ask if anything needs adjustment before it goes to the design team or client. | Yes — "Here's your post-discovery brief. This is meant to be the handoff document to design — everything they need to start work. Take a look: are there any decisions I captured wrong, anything missing from the meeting, or areas where you want me to go deeper?" |

### Quality Checks

| Check | Internal Prompt |
|---|---|
| Decision completeness | "Review the discovery notes against the decision log. Is there any decision, direction, or confirmed choice from the meeting that isn't captured in the log? Flag any gaps." |
| Delta accuracy | "Compare the pre-brief hypotheses against the delta section. Is every hypothesis marked as validated, overturned, refined, or untested? Flag any hypothesis that was silently dropped." |
| Actionability test | "Read this brief as if you're a designer who wasn't in the discovery meeting. Can you begin design work from this document alone? Flag every place where you'd need to ask a question before proceeding." |
| Audience ranking | "Check the audience hierarchy. Are audiences ranked by priority? Is it clear which audience wins when design decisions conflict? If the ranking is vague or absent, flag it." |
| Open items flagged | "Identify every place in the brief where a question remains open. Verify each one is explicitly flagged as unresolved with a clear statement of what needs to happen to resolve it." |
| Copy seed specificity | "Read each copy seed. Does it reflect something specific from the discovery? Flag any copy seed that could appear unchanged in a brief for a different client." |
| Brand compliance | "Verify that every color, font, and visual treatment in the output traces to the resolved brand source. Flag any color or typographic choice that was invented." |

### Failure Modes

| Failure Mode | Mitigation |
|---|---|
| Options instead of decisions | Every section must state conclusions where they exist. Options are only acceptable when the meeting genuinely left something unresolved — and those must be flagged with a resolution path. |
| Missing the delta | The delta section is mandatory when a pre-brief exists. Every hypothesis must be accounted for. |
| Generic copy seeds | Copy seeds must be traceable to something the client said or something the discovery revealed. |
| Architecture without rationale | Every page must have a stated purpose and target audience. |
| Buried open questions | Open questions get their own section with specific resolution paths. |
| Invented brand treatment | Never invent colors or typography. Follow the Brand Resolution cascade. |

### Vision of Good

A strong post-discovery brief eliminates the "that's not what I meant" conversation six weeks into design. The design team picks it up and knows exactly what they're building, for whom, and why. The client reads it and says "yes, that's what we discussed." The brief looks and feels like the client's brand — which signals that JDA isn't just listening, they're already building in the client's world.

### Tips

- Run this prompt while the meeting is still fresh. Same day is ideal.
- Feed it everything — voice memo transcripts, messy notes, bullet points from a whiteboard photo.
- If a pre-brief was produced, explicitly mention it.
- This document is also the client alignment artifact. Sending it for sign-off before design begins eliminates the most expensive category of project failure: misalignment discovered after design is underway.

---
---

# Methodology #3: Client Strategy Brief (Updated)

### Metadata

| Field | Value |
|---|---|
| **name** | Client strategy brief |
| **slug** | `client_strategy_brief` |
| **practice** | Agency-Wide |
| **ai_classification** | AI-Assisted |
| **proven_status** | false (in validation) |
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
| Brand guide | File / Text | No | Client's brand guide if available. Claude also checks Alexandria for an existing brand package. See Brand Resolution logic. | *(Handled by Brand Resolution step — Claude checks Alexandria first, then asks if needed)* |
| Known constraints | Text | No | Budget, timeline, stakeholder dynamics, political considerations | "Are there any constraints I should know about? Budget, timeline, stakeholder dynamics, political considerations — anything that limits what can be recommended." |
| Audience | Text | No | Who will read this brief and what they care about. Defaults to CMO-level if not specified. | "Who's reading this brief? A CMO, a board, an internal team? Knowing the audience helps me calibrate the tone and what to emphasize." |
| Output format preference | Text | No | Whether the brief should be a styled HTML document or plain prose. Defaults to plain prose for strategy briefs. | "Do you want this as a styled document I can share with the client, or as plain text you'll drop into a deck or email?" |
| Supporting context | File / Text | No | Background materials — previous strategy docs, performance data, competitive intel, meeting notes | "Do you have any background materials I should review? Previous strategy docs, performance data, competitive intel — anything that gives me more context." |

### System Instructions

```
You are producing a client strategy brief for JDA Worldwide. This is an executive-level strategic document — tight, direct, and decisive. It makes an argument, not a presentation. It leads with the conclusion, not the setup.

BRAND RESOLUTION (execute only if the practitioner requests a styled/client-facing document):
1. Check Alexandria for a client brand package for this client
2. If found: confirm with the practitioner before using it — they may have a newer version
3. If not found: ask the practitioner if they have a brand guide to share
4. If the practitioner provides a guide (file, link, or description): use it as the source of truth
5. If no guide is available from any source: inspect the client's website and extract the visible brand system
6. If the client's website is unavailable: use JDA's house style
7. Never invent a color palette.

Note: Strategy briefs are often delivered as plain prose (dropped into a deck, email, or presentation) rather than as styled HTML documents. Ask the practitioner about their preferred output format. If plain prose, Brand Resolution is not needed.

VOICE AND TONE:
- Write as a senior strategist, not a consultant. A strategist says what to do and why. A consultant presents options.
- No hedging language: "it seems," "might," "could potentially" — cut all of it. If you're uncertain, say so directly.
- No bullet points unless absolutely necessary. Executive prose.
- No filler. No throat-clearing. No "in today's rapidly evolving landscape." Lead with the insight.
- Tight. The entire brief should be under 400 words.

METHODOLOGY:

1. SITUATION ASSESSMENT
   What's true right now. Not background — the specific current reality that makes this brief necessary. Two to three sentences maximum.

2. STRATEGIC RECOMMENDATION
   What to do and why. Must be:
   - Specific enough to act on
   - Grounded in the situation assessment
   - Opinionated — JDA has a point of view

3. KEY TRADE-OFFS
   What this approach costs. Two to three trade-offs maximum. Each must be honest, not a disguised benefit.

4. SUCCESS METRIC
   One metric that would prove this recommendation worked. Not a dashboard of KPIs — one number.

OUTPUT FORMAT:
- If styled document requested: Single HTML file using the resolved brand system
- If plain prose requested: Clean text with four sections (Situation, Recommendation, Trade-offs, Metric), no additional headers
- Under 400 words total in either format

IMPORTANT BEHAVIORAL INSTRUCTIONS:
- The 400-word constraint is not a suggestion. It forces prioritization.
- The recommendation must be traceable to the situation.
- The success metric must be measurable — not "improved brand perception" but a specific number at a specific time.
- If constraints were provided, the recommendation must operate within them.
```

### Steps

| Step | Name | Instructions | Approval Gate |
|---|---|---|---|
| 1 | Collect inputs and resolve format/brand | Ask for required inputs. Determine output format (styled document vs. plain prose). If styled, execute Brand Resolution. If the challenge description is thin, ask one or two follow-up questions. | No |
| 2 | Produce brief | Execute the methodology. Deliver the complete brief under 400 words. | Yes — "Here's the strategy brief. Is the recommendation landing the way you'd want it to? Anything I should sharpen, reframe, or adjust before this goes to the client?" |

### Quality Checks

| Check | Internal Prompt |
|---|---|
| Word count | "Count the words in the brief. If it exceeds 400, identify what can be cut without losing the argument." |
| Recommendation specificity | "Could a client forward this to their team and have them begin execution? If not, it's too vague." |
| Situation-recommendation alignment | "Does the recommendation directly address the reality described in the situation section?" |
| Constraint compliance | "If the practitioner provided constraints, verify the recommendation operates within them." |
| Hedging language | "Scan for: 'might,' 'could,' 'it seems,' 'potentially,' 'it may be worth considering.' Flag every instance." |
| Metric measurability | "Can the stated success metric be measured with a number at a specific point in time?" |
| Brand compliance (if styled) | "If this is a styled document, verify all colors and typography trace to the resolved brand source." |

### Failure Modes

| Failure Mode | Mitigation |
|---|---|
| Consultant mode | The brief must make a single recommendation and defend it. If genuinely two viable paths, pick one and acknowledge the alternative as a trade-off. |
| Generic strategy language | Every sentence must be traceable to something specific about this client. |
| Recommendation exceeds constraints | Read constraints before writing. If the recommendation requires resources beyond constraints, explicitly address why the constraint should be reconsidered. |
| Vanity metric | The metric must directly measure the outcome the recommendation is designed to produce. |
| Invented brand treatment (if styled) | Follow the Brand Resolution cascade. Never invent. |

### Vision of Good

A strong client strategy brief changes the meeting. Instead of a 40-slide presentation, the client gets a document that says: here's what's happening, here's what to do about it, here's what it costs you, and here's how we'll know it worked. The brevity is the point — a strategist who can't express the recommendation in 400 words hasn't done the thinking.

### Tips

- This methodology works for internal strategy recommendations too. Swap the audience context accordingly.
- If the practitioner says "I don't know the constraints," note that constraints are undefined and flag the risk.
- The trade-offs section is where trust is built. A brief that acknowledges downsides honestly is more persuasive than one that pretends they don't exist.
- This pairs naturally with the pre-discovery brief methodology. The pre-discovery brief produces the research; the strategy brief distills it into a recommendation.

---

*All three methodologies now include the universal Brand Resolution step. The pattern: check Alexandria → confirm with practitioner → practitioner-provided guide overrides → client website extraction as fallback → JDA house style as baseline → never invent.*
