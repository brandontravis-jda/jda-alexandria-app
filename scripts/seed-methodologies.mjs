import { createClient } from "@sanity/client";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
    .filter(([k]) => k)
    .map(([k, ...v]) => [k, v.join("=")])
);

const client = createClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: env.SANITY_API_TOKEN,
  useCdn: false,
});

const methodologies = [
  {
    _type: "productionMethodology",
    name: "Pre-discovery brief",
    slug: { _type: "slug", current: "pre_discovery_brief" },
    description:
      "Produces a comprehensive research brief before a client discovery meeting. Claude researches the client, audits their current site, analyzes competitors, and generates testable hypotheses — so the practitioner walks into discovery already knowing what they think, not asking 'tell us about yourself.' The output is a professional HTML document that can be shared with the team or the client directly.",
    aiClassification: "ai_led",
    toolsInvolved: ["claude"],
    author: "Brandon",
    provenStatus: false,
    version: 1,
    requiredInputs: [
      {
        _key: "input-1",
        name: "Client name",
        inputType: "text",
        required: true,
        description: "The name of the client or prospect",
        promptText: "What's the client or prospect name?",
      },
      {
        _key: "input-2",
        name: "Website URL",
        inputType: "url",
        required: true,
        description: "The client's current website",
        promptText: "What's their website URL?",
      },
      {
        _key: "input-3",
        name: "Supporting documents",
        inputType: "file",
        required: false,
        description:
          "Any existing materials — proposals, RFPs, brand standards, meeting notes, call transcripts. Even messy or partial documents improve output significantly.",
        promptText:
          "Do you have any existing documents I should review? Proposals, brand standards, meeting notes, old RFPs — anything you have, even if it's rough. The more context I have, the more specific the brief will be.",
      },
      {
        _key: "input-4",
        name: "Specific concerns or focus areas",
        inputType: "text",
        required: false,
        description:
          "Anything the practitioner already knows or suspects about the client's needs",
        promptText:
          "Is there anything specific you already know or suspect about what they need? Any particular areas you want me to focus on?",
      },
    ],
    systemInstructions: `You are producing a pre-discovery brief for a JDA Worldwide client engagement. This brief is your primary deliverable. It must be comprehensive enough that the practitioner walks into the discovery meeting with confident, testable hypotheses — not generic questions.

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
- The discovery questions are the second most valuable part. They should make the practitioner feel like they've already done their homework — because they have.`,
    steps: [
      {
        _key: "step-1",
        name: "Collect inputs",
        instructions:
          "Ask for required inputs. Confirm what's been provided. Note what's missing and whether it's needed or optional.",
        approvalGate: false,
      },
      {
        _key: "step-2",
        name: "Research and analysis",
        instructions:
          "Execute the full methodology: research, audit, competitive analysis, hypotheses, architecture, questions, copy seeds. Produce the complete HTML brief.",
        approvalGate: false,
      },
      {
        _key: "step-3",
        name: "Deliver and iterate",
        instructions:
          "Present the completed brief. Ask if the practitioner wants to review it before the meeting or if anything needs adjustment.",
        approvalGate: true,
        gatePrompt:
          "Here's your pre-discovery brief. Take a look — is there anything you'd like me to adjust before your meeting? Any hypotheses that feel off, questions you'd add or remove, or areas you want me to dig deeper on?",
        iterationProtocol:
          "Open-ended feedback. Practitioner directs changes in natural language. Claude implements and re-delivers.",
      },
    ],
    outputFormat:
      "Single HTML file. Fully styled with the client's brand colors if identifiable. Professional presentation quality — ready to open in a browser, share as a link, or export as a PDF. All sections present with clear headers. Confidence indicators on hypotheses and inferred information.",
    qualityChecks: [
      {
        _key: "qc-1",
        name: "Confident wrongness",
        description: "Are any claims stated as fact that could be wrong?",
        checkPrompt:
          "Review every specific claim in this brief — company details, competitor information, market assertions. Flag anything you stated with confidence that you should have flagged as uncertain or unverified.",
      },
      {
        _key: "qc-2",
        name: "Specificity test",
        description:
          "Are the hypotheses and questions specific to this client, or could they apply to anyone?",
        checkPrompt:
          "Read each hypothesis and each discovery question. If it could appear unchanged in a brief for a completely different client, it's too generic. Flag and replace.",
      },
      {
        _key: "qc-3",
        name: "Context retention",
        description:
          "If supporting documents were provided, did the brief incorporate them?",
        checkPrompt:
          "If the practitioner provided supporting documents, verify that key information from those documents is reflected in the brief. Flag any provided context that was ignored.",
      },
      {
        _key: "qc-4",
        name: "Architecture rationale",
        description:
          "Does every structural decision in the proposed architecture have a stated reason?",
        checkPrompt:
          "Check each page in the proposed site architecture. Does it have a clear rationale grounded in the research? Flag any page that's included 'because websites usually have one' rather than because the research supports it.",
      },
      {
        _key: "qc-5",
        name: "Gap honesty",
        description: "Are gaps and unknowns clearly flagged, not papered over?",
        checkPrompt:
          "Identify every place in the brief where you don't have enough information to be confident. Verify that each one is explicitly flagged as a hypothesis or open question, not presented as a conclusion.",
      },
    ],
    failureModes: [
      {
        _key: "fm-1",
        name: "Generic hypotheses",
        description:
          "Hypotheses that could apply to any company ('improve their SEO,' 'modernize the design'). Useless in a discovery meeting.",
        mitigation:
          "Every hypothesis must reference something specific from the research. If it can't be traced to a specific finding, cut it.",
      },
      {
        _key: "fm-2",
        name: "Surface-level audit",
        description:
          "Audit stays at 'the site looks dated' without identifying specific structural, content, or functional problems.",
        mitigation:
          "Audit must identify specific pages, specific content gaps, specific architectural problems.",
      },
      {
        _key: "fm-3",
        name: "Research echo chamber",
        description:
          "Brief restates what the client's own site says without adding analytical value.",
        mitigation:
          "The brief's value is in what the client can't see about themselves. Competitive context, market positioning gaps, structural problems they've normalized.",
      },
      {
        _key: "fm-4",
        name: "Overconfidence on inferred information",
        description:
          "Brief presents research-derived assumptions as confirmed facts.",
        mitigation:
          "Every piece of information is either verified or inferred. Label the difference.",
      },
      {
        _key: "fm-5",
        name: "Cookie-cutter architecture",
        description:
          "Proposed site architecture follows a generic template rather than responding to the client's actual needs.",
        mitigation:
          "Architecture must be justified by the research. No default templates.",
      },
    ],
    visionOfGood:
      "A strong pre-discovery brief makes the practitioner feel overprepared. They walk into the meeting knowing what the client does and who they serve (at a level of detail that surprises the client), what's wrong with their current site and specifically why, how their competitors are outperforming them on the web, what they think the site needs to do (testable hypotheses), what they still need to learn (targeted questions), and what the site might say (copy seeds). The discovery meeting shifts from 'tell us about yourself' to 'here's what we think — tell us where we're wrong.'",
    tips: "The more supporting documents the practitioner provides, the better the brief. A proposal, an old RFP, call notes from a BD conversation — all of it helps Claude produce specific, grounded analysis instead of generic observations from the public website alone. If the client's site is very thin, lean harder on competitive analysis. The HTML output format is intentional — it renders in a browser, can be shared as a link, can be exported as PDF.",
    clientRefinements: [],
  },
  {
    _type: "productionMethodology",
    name: "Post-discovery brief",
    slug: { _type: "slug", current: "post_discovery_brief" },
    description:
      "Produces a comprehensive project brief immediately after a client discovery meeting. Claude locks validated decisions, documents what changed from pre-discovery hypotheses, and produces a single document that replaces the build spec, site architecture doc, copy brief, and internal alignment deck. The output is a professional HTML document ready to hand directly to a design team or share with the client for sign-off before design begins.",
    aiClassification: "ai_led",
    toolsInvolved: ["claude"],
    author: "Brandon",
    provenStatus: false,
    version: 1,
    requiredInputs: [
      {
        _key: "input-1",
        name: "Client name",
        inputType: "text",
        required: true,
        description: "The name of the client",
        promptText: "What's the client name?",
      },
      {
        _key: "input-2",
        name: "Discovery notes",
        inputType: "text",
        required: true,
        description:
          "Everything from the discovery meeting — notes, transcripts, whiteboard photos, voice memo transcripts, bullet points. Messy is fine.",
        promptText:
          "Give me everything from the discovery meeting. Notes, transcripts, whiteboard photos, voice memos — even messy bullet points work. The more raw material I have, the stronger the brief.",
      },
      {
        _key: "input-3",
        name: "Pre-discovery brief",
        inputType: "file",
        required: false,
        description:
          "If a pre-discovery brief was produced, include it. Claude will use the delta between pre and post as a structural element.",
        promptText:
          "Did we run a pre-discovery brief before this meeting? If so, attach or paste it — I'll document what changed and what held up.",
      },
      {
        _key: "input-4",
        name: "Decisions made",
        inputType: "text",
        required: false,
        description: "Any specific decisions that were confirmed in the meeting",
        promptText:
          "Were there any specific decisions locked in the meeting? Things the client confirmed, directions they chose, options they rejected?",
      },
      {
        _key: "input-5",
        name: "Supporting documents",
        inputType: "file",
        required: false,
        description:
          "Any materials shared during or after discovery — strategy docs, brand standards, existing content, competitor examples",
        promptText:
          "Did the client share any documents during or after discovery? Brand guidelines, strategy docs, existing content — anything that came up in the meeting.",
      },
    ],
    systemInstructions: `You are producing a post-discovery brief for a JDA Worldwide client engagement. This is the single source of truth document for the project. It replaces the build spec, site architecture doc, copy brief, and internal alignment deck. One document, not four.

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
   
   This delta section is often the most valuable strategic insight of the entire engagement.

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

8. SEQUENCE NEXT STEPS
   What happens after this brief is approved, in order, with ownership and dependencies.

OUTPUT FORMAT:
- Single HTML file, fully styled
- Professional enough to send to the client for sign-off or hand to a design team as the project source of truth
- Decision log formatted as a scannable table
- Architecture formatted as a structured hierarchy

IMPORTANT BEHAVIORAL INSTRUCTIONS:
- This document produces conclusions, not options.
- The delta section is not optional when a pre-brief exists.
- Copy seeds must reflect what was learned in discovery, not generic marketing language.
- The audience hierarchy must be ranked. "Everyone" is not an audience.`,
    steps: [
      {
        _key: "step-1",
        name: "Collect inputs",
        instructions:
          "Ask for required inputs. Confirm what's been provided. If no pre-brief exists, note that the delta section will be skipped.",
        approvalGate: false,
      },
      {
        _key: "step-2",
        name: "Synthesize and produce",
        instructions:
          "Execute the full methodology. Produce the complete HTML brief.",
        approvalGate: false,
      },
      {
        _key: "step-3",
        name: "Deliver and iterate",
        instructions:
          "Present the completed brief. Ask if anything needs adjustment before it goes to the design team or client.",
        approvalGate: true,
        gatePrompt:
          "Here's your post-discovery brief. This is meant to be the handoff document to design — everything they need to start work. Take a look: are there any decisions I captured wrong, anything missing from the meeting, or areas where you want me to go deeper?",
        iterationProtocol:
          "Open-ended feedback. Practitioner directs changes in natural language. Claude implements and re-delivers.",
      },
    ],
    outputFormat:
      "Single HTML file. Fully styled with the client's brand system if identifiable. Professional presentation quality — ready to send to the client for sign-off or hand to a design team as the project source of truth. Decision log as a scannable table. Architecture as a structured hierarchy.",
    qualityChecks: [
      {
        _key: "qc-1",
        name: "Decision completeness",
        description:
          "Does the decision log capture every material call from the notes?",
        checkPrompt:
          "Review the discovery notes against the decision log. Is there any decision, direction, or confirmed choice from the meeting that isn't captured in the log? Flag any gaps.",
      },
      {
        _key: "qc-2",
        name: "Delta accuracy",
        description:
          "If a pre-brief exists, is every hypothesis accounted for?",
        checkPrompt:
          "Compare the pre-brief hypotheses against the delta section. Is every hypothesis marked as validated, overturned, refined, or untested? Flag any hypothesis that was silently dropped.",
      },
      {
        _key: "qc-3",
        name: "Actionability test",
        description:
          "Could a designer start work from this document without scheduling another meeting?",
        checkPrompt:
          "Read this brief as if you're a designer who wasn't in the discovery meeting. Can you begin design work from this document alone? Flag every place where you'd need to ask a question before proceeding.",
      },
      {
        _key: "qc-4",
        name: "Audience ranking",
        description:
          "Is the audience hierarchy actually ranked, with clear priority?",
        checkPrompt:
          "Check the audience hierarchy. Are audiences ranked by priority? Is it clear which audience wins when design decisions conflict? If the ranking is vague or absent, flag it.",
      },
      {
        _key: "qc-5",
        name: "Open items flagged",
        description:
          "Are unresolved questions explicitly flagged, not papered over?",
        checkPrompt:
          "Identify every place in the brief where a question remains open. Verify each one is explicitly flagged as unresolved with a clear statement of what needs to happen to resolve it.",
      },
    ],
    failureModes: [
      {
        _key: "fm-1",
        name: "Options instead of decisions",
        description:
          "Brief presents 'the client could do X or Y' when the meeting actually decided on X.",
        mitigation:
          "Every section must state conclusions where they exist. Options are only acceptable when the meeting genuinely left something unresolved — and those must be flagged with a resolution path.",
      },
      {
        _key: "fm-2",
        name: "Missing the delta",
        description:
          "If a pre-brief exists and the post-brief doesn't document what changed, the most valuable strategic insight is lost.",
        mitigation:
          "The delta section is mandatory when a pre-brief exists. Every hypothesis must be accounted for.",
      },
      {
        _key: "fm-3",
        name: "Generic copy seeds",
        description:
          "Copy seeds that don't reflect the client's actual language and positioning from the meeting.",
        mitigation:
          "Copy seeds must be traceable to something the client said or something the discovery revealed.",
      },
      {
        _key: "fm-4",
        name: "Architecture without rationale",
        description:
          "A page list with no explanation of why each page exists or what it's meant to do.",
        mitigation:
          "Every page in the architecture must have a stated purpose and target audience.",
      },
    ],
    visionOfGood:
      "A strong post-discovery brief eliminates the 'that's not what I meant' conversation six weeks into design. The design team picks it up and knows exactly what they're building, for whom, and why. The client reads it and says 'yes, that's what we discussed.' The delta section is the strategic centerpiece — it shows the gap between assumptions and reality.",
    tips: "Run this prompt while the meeting is still fresh. Same day is ideal. Feed it everything — voice memo transcripts, messy notes, bullet points from a whiteboard photo. Claude can synthesize chaotic inputs. This document is also the client alignment artifact. Sending it to the client for sign-off before design begins eliminates the most expensive category of project failure: misalignment discovered after design is underway.",
    clientRefinements: [],
  },
  {
    _type: "productionMethodology",
    name: "Client strategy brief",
    slug: { _type: "slug", current: "client_strategy_brief" },
    description:
      "Produces a concise strategic brief for a client engagement — a tight, executive-level document that assesses the situation, makes a recommendation, acknowledges trade-offs, and identifies the metric that proves it worked. Used when a practitioner needs to frame a strategic recommendation for a client, prepare for a strategy presentation, or produce a written brief for a CMO-level audience. This is not a discovery brief or a project spec — it's a strategic argument.",
    aiClassification: "ai_assisted",
    toolsInvolved: ["claude"],
    author: "Brandon",
    provenStatus: false,
    version: 1,
    requiredInputs: [
      {
        _key: "input-1",
        name: "Client name",
        inputType: "text",
        required: true,
        description: "The client this brief is for",
        promptText: "Which client is this for?",
      },
      {
        _key: "input-2",
        name: "Industry",
        inputType: "text",
        required: true,
        description: "The client's industry or sector",
        promptText: "What industry or sector are they in?",
      },
      {
        _key: "input-3",
        name: "Challenge",
        inputType: "text",
        required: true,
        description: "The problem or opportunity the brief is addressing",
        promptText:
          "What's the challenge or opportunity you're addressing? A sentence or two is fine — I'll ask follow-up questions if I need more.",
      },
      {
        _key: "input-4",
        name: "Known constraints",
        inputType: "text",
        required: false,
        description:
          "Budget, timeline, stakeholder dynamics, political considerations, or any other constraints that shape the recommendation",
        promptText:
          "Are there any constraints I should know about? Budget, timeline, stakeholder dynamics, political considerations — anything that limits what can be recommended.",
      },
      {
        _key: "input-5",
        name: "Audience",
        inputType: "text",
        required: false,
        description:
          "Who will read this brief and what they care about. Defaults to CMO-level if not specified.",
        promptText:
          "Who's reading this brief? A CMO, a board, an internal team? Knowing the audience helps me calibrate the tone and what to emphasize.",
      },
      {
        _key: "input-6",
        name: "Supporting context",
        inputType: "file",
        required: false,
        description:
          "Any background materials — previous strategy docs, performance data, competitive intel, meeting notes",
        promptText:
          "Do you have any background materials I should review? Previous strategy docs, performance data, competitive intel — anything that gives me more context.",
      },
    ],
    systemInstructions: `You are producing a client strategy brief for JDA Worldwide. This is an executive-level strategic document — tight, direct, and decisive. It makes an argument, not a presentation. It leads with the conclusion, not the setup.

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
   - Grounded in the situation assessment
   - Opinionated — JDA has a point of view, and this brief expresses it

3. KEY TRADE-OFFS
   What this approach costs. Two to three trade-offs maximum. Each must be honest, not a disguised benefit.

4. SUCCESS METRIC
   One metric that would prove this recommendation worked. Not a dashboard of KPIs — one number.

OUTPUT FORMAT:
- Clean, structured prose document
- Four sections: Situation, Recommendation, Trade-offs, Metric
- No additional headers beyond these four
- Under 400 words total

IMPORTANT BEHAVIORAL INSTRUCTIONS:
- The 400-word constraint is not a suggestion.
- The recommendation must be traceable to the situation.
- The success metric must be measurable.
- If the practitioner provided constraints, the recommendation must operate within them.`,
    steps: [
      {
        _key: "step-1",
        name: "Collect inputs",
        instructions:
          "Ask for required inputs. If the challenge description is thin, ask one or two follow-up questions to understand the situation before writing.",
        approvalGate: false,
      },
      {
        _key: "step-2",
        name: "Produce brief",
        instructions:
          "Execute the methodology. Deliver the complete brief under 400 words.",
        approvalGate: true,
        gatePrompt:
          "Here's the strategy brief. Is the recommendation landing the way you'd want it to? Anything I should sharpen, reframe, or adjust before this goes to the client?",
        iterationProtocol:
          "Open-ended feedback. Practitioner directs changes. Claude iterates.",
      },
    ],
    outputFormat:
      "Clean prose document. Four sections: Situation, Recommendation, Trade-offs, Metric. No additional headers. Under 400 words. Professional enough to send to a CMO.",
    qualityChecks: [
      {
        _key: "qc-1",
        name: "Word count",
        description: "Is the brief under 400 words?",
        checkPrompt:
          "Count the words in the brief. If it exceeds 400, identify what can be cut without losing the argument.",
      },
      {
        _key: "qc-2",
        name: "Recommendation specificity",
        description: "Is the recommendation specific enough to act on?",
        checkPrompt:
          "Read the recommendation. Could a client forward this to their team and have them begin execution? If not, it's too vague. Identify what needs to be more specific.",
      },
      {
        _key: "qc-3",
        name: "Situation-recommendation alignment",
        description:
          "Does the recommendation directly respond to the stated situation?",
        checkPrompt:
          "Does the recommendation directly address the reality described in the situation section? If the situation talks about X and the recommendation addresses Y, flag the disconnect.",
      },
      {
        _key: "qc-4",
        name: "Hedging language",
        description: "Is the prose direct and decisive?",
        checkPrompt:
          "Scan the brief for hedging: 'might,' 'could,' 'it seems,' 'potentially,' 'it may be worth considering.' Flag every instance. Replace with direct statements or honest uncertainty.",
      },
      {
        _key: "qc-5",
        name: "Metric measurability",
        description: "Is the success metric actually measurable?",
        checkPrompt:
          "Can the stated success metric be measured with a number at a specific point in time? If it's vague, flag it and suggest a measurable alternative.",
      },
    ],
    failureModes: [
      {
        _key: "fm-1",
        name: "Consultant mode",
        description:
          "Brief presents options instead of making a recommendation.",
        mitigation:
          "The brief must make a single recommendation and defend it. If there are genuinely two viable paths, pick one and explain why.",
      },
      {
        _key: "fm-2",
        name: "Generic strategy language",
        description:
          "'Leverage your brand equity to drive digital transformation' — language that sounds strategic but says nothing specific.",
        mitigation:
          "Every sentence must be traceable to something specific about this client, their situation, or their constraints.",
      },
      {
        _key: "fm-3",
        name: "Recommendation exceeds constraints",
        description:
          "The brief proposes something the client can't do given their stated budget, timeline, or organizational reality.",
        mitigation:
          "Read the constraints before writing. If the recommendation requires resources beyond the constraints, either scope it differently or explicitly address why the constraint should be reconsidered.",
      },
      {
        _key: "fm-4",
        name: "Vanity metric",
        description:
          "Success metric is something that sounds good but doesn't prove the recommendation worked.",
        mitigation:
          "The metric must directly measure the outcome the recommendation is designed to produce. Not a proxy metric. Not a vanity metric.",
      },
    ],
    visionOfGood:
      "A strong client strategy brief changes the meeting. Instead of a rambling strategy presentation with 40 slides, the client gets a one-page document that says: here's what's happening, here's what to do about it, here's what it costs you, and here's how we'll know it worked. The brevity is the point. A strategist who can't express the recommendation in 400 words hasn't done the thinking.",
    tips: "This methodology works for internal strategy recommendations too. If the practitioner says 'I don't know the constraints,' that's useful information — the brief should note that constraints are undefined and flag the risk. The trade-offs section is where trust is built. This pairs naturally with the pre-discovery brief methodology.",
    clientRefinements: [],
  },
];

async function seed() {
  console.log("Seeding production methodologies...\n");

  for (const methodology of methodologies) {
    const existing = await client.fetch(
      `*[_type == "productionMethodology" && slug.current == $slug][0]._id`,
      { slug: methodology.slug.current }
    );

    if (existing) {
      console.log(`⏭  Skipping "${methodology.name}" — already exists`);
      continue;
    }

    const result = await client.create(methodology);
    console.log(`✓  Created "${methodology.name}" (${result._id})`);
  }

  console.log("\nDone.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
