import { defineField, defineType, defineArrayMember } from "sanity";

export default defineType({
  name: "productionMethodology",
  title: "Production Methodology",
  type: "document",
  fields: [
    // --- Core Identity ---
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: "Plain language name practitioners use. e.g. 'Pre-discovery brief', 'Press release'",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name" },
      description: "Machine-readable identifier used in MCP tool calls.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
      description: "One paragraph. What this methodology produces and when to use it. Used by Claude to confirm it matched the right methodology.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "practice",
      title: "Practice Area",
      type: "reference",
      to: [{ type: "practiceArea" }],
      description: "Which practice owns this. Leave blank for Agency-Wide methodologies.",
    }),
    defineField({
      name: "aiClassification",
      title: "AI Classification",
      type: "string",
      options: {
        list: [
          { title: "AI-Led", value: "ai_led" },
          { title: "AI-Assisted", value: "ai_assisted" },
          { title: "Human-Led", value: "human_led" },
        ],
        layout: "radio",
      },
      validation: (R) => R.required(),
    }),
    defineField({
      name: "toolsInvolved",
      title: "Tools Involved",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Claude", value: "claude" },
          { title: "Cursor", value: "cursor" },
          { title: "Midjourney", value: "midjourney" },
          { title: "Gemini", value: "gemini" },
          { title: "ChatGPT", value: "chatgpt" },
          { title: "Perplexity", value: "perplexity" },
        ],
      },
    }),

    // --- Required Inputs ---
    defineField({
      name: "requiredInputs",
      title: "Required Inputs",
      type: "array",
      description: "What Claude must collect from the practitioner before executing.",
      of: [
        {
          type: "object",
          fields: [
            { name: "name", title: "Input Name", type: "string", validation: (R) => R.required() },
            {
              name: "inputType",
              title: "Type",
              type: "string",
              options: {
                list: [
                  { title: "Text", value: "text" },
                  { title: "URL", value: "url" },
                  { title: "File", value: "file" },
                  { title: "Selection", value: "selection" },
                ],
              },
            },
            { name: "required", title: "Required", type: "boolean", initialValue: true },
            { name: "description", title: "Description", type: "text", rows: 2 },
            { name: "promptText", title: "How Claude Asks", type: "text", rows: 2, description: "The exact language Claude uses to ask the practitioner for this input." },
          ],
          preview: {
            select: { title: "name", subtitle: "required" },
            prepare(value: Record<string, unknown>) {
              return { title: value.title as string, subtitle: value.subtitle ? "Required" : "Optional" };
            },
          },
        },
      ],
    }),

    // --- System Instructions ---
    defineField({
      name: "systemInstructions",
      title: "System Instructions",
      type: "text",
      rows: 20,
      description: "The core methodology. Never displayed to the practitioner. This is the IP — the actual instructions Claude uses to produce the deliverable.",
      validation: (R) => R.required(),
    }),

    // --- Steps ---
    defineField({
      name: "steps",
      title: "Steps",
      type: "array",
      description: "Ordered sequence of steps for multi-step workflows.",
      of: [
        {
          type: "object",
          fields: [
            { name: "name", title: "Step Name", type: "string", validation: (R) => R.required() },
            { name: "instructions", title: "Instructions", type: "text", rows: 4 },
            { name: "approvalGate", title: "Approval Gate", type: "boolean", initialValue: false, description: "Does Claude pause here for practitioner feedback?" },
            { name: "gatePrompt", title: "Gate Prompt", type: "text", rows: 3, description: "How Claude asks for approval/feedback at this step." },
            { name: "iterationProtocol", title: "Iteration Protocol", type: "text", rows: 2, description: "How feedback is structured at this step." },
          ],
          preview: {
            select: { title: "name", subtitle: "approvalGate" },
            prepare(value: Record<string, unknown>) {
              return { title: value.title as string, subtitle: value.subtitle ? "⏸ Approval gate" : "" };
            },
          },
        },
      ],
    }),

    // --- Output Format ---
    defineField({
      name: "outputFormat",
      title: "Output Format",
      type: "text",
      rows: 4,
      description: "What the deliverable looks like — HTML document, markdown, structured data, Word doc, etc.",
    }),

    // --- Quality Checks ---
    defineField({
      name: "qualityChecks",
      title: "Quality Checks",
      type: "array",
      description: "What Claude self-checks before delivering.",
      of: [
        {
          type: "object",
          fields: [
            { name: "name", title: "Check Name", type: "string", validation: (R) => R.required() },
            { name: "description", title: "Description", type: "text", rows: 2 },
            { name: "checkPrompt", title: "Internal Check Prompt", type: "text", rows: 3, description: "The internal prompt Claude runs to verify this check." },
          ],
          preview: { select: { title: "name" } },
        },
      ],
    }),

    // --- Failure Modes ---
    defineField({
      name: "failureModes",
      title: "Failure Modes",
      type: "array",
      description: "Common ways this deliverable goes wrong. Loaded as negative constraints.",
      of: [
        {
          type: "object",
          fields: [
            { name: "name", title: "Failure Mode", type: "string", validation: (R) => R.required() },
            { name: "description", title: "Description", type: "text", rows: 2 },
            { name: "mitigation", title: "Mitigation", type: "text", rows: 2 },
          ],
          preview: { select: { title: "name" } },
        },
      ],
    }),

    // --- Vision of Good ---
    defineField({
      name: "visionOfGood",
      title: "Vision of Good",
      type: "text",
      rows: 6,
      description: "What excellent looks like. System-level — used by Claude for calibration, never shown to the practitioner.",
    }),

    // --- Tips ---
    defineField({
      name: "tips",
      title: "Tips",
      type: "text",
      rows: 6,
      description: "Additional operational context for Claude. Edge cases, things that improve output quality.",
    }),

    // --- Client Refinements ---
    defineField({
      name: "clientRefinements",
      title: "Client Refinements",
      type: "array",
      description: "Client-specific adjustments layered on top of the base methodology.",
      of: [
        {
          type: "object",
          fields: [
            { name: "client", title: "Client Name", type: "string", validation: (R) => R.required() },
            { name: "refinementText", title: "Refinement", type: "text", rows: 4, description: "What changes for this client." },
            { name: "context", title: "Context", type: "text", rows: 2, description: "Why this refinement exists." },
          ],
          preview: { select: { title: "client" } },
        },
      ],
    }),

    // --- Quality Checklist (human handoff gates — surfaced by Claude after production) ---
    defineField({
      name: "qualityChecklist",
      title: "Quality Checklist",
      type: "array",
      description: "Human-executed gates Claude surfaces at the end of every production run. Claude does not run these — it presents them as a handoff prompt.",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "gate", title: "Gate Name", type: "string", validation: (R) => R.required() }),
            defineField({ name: "description", title: "What to check", type: "text", rows: 2 }),
            defineField({
              name: "tier",
              title: "Who performs this check",
              type: "string",
              options: {
                list: [
                  { title: "Practitioner", value: "practitioner" },
                  { title: "Practice Leader", value: "practice_leader" },
                  { title: "Gatekeeper", value: "gatekeeper" },
                ],
              },
            }),
          ],
          preview: {
            select: { title: "gate", subtitle: "tier" },
            prepare(value: Record<string, unknown>) {
              const tierLabel: Record<string, string> = {
                practitioner: "Practitioner",
                practice_leader: "Practice Leader",
                gatekeeper: "Gatekeeper",
              };
              return {
                title: value.title as string,
                subtitle: tierLabel[(value.subtitle as string) ?? ""] ?? "",
              };
            },
          },
        }),
      ],
    }),

    // --- Production Time ---
    defineField({
      name: "baselineProductionTime",
      title: "Legacy Baseline Production Time",
      type: "string",
      description: 'How long this deliverable type took before AI-native production. From Discovery Intensive estimates. Example: "4–6 hours"',
    }),
    defineField({
      name: "aiNativeProductionTime",
      title: "AI-Native Production Time",
      type: "string",
      description: "Observed production time using the AI-native workflow. Populated after reaching Proven Status.",
    }),

    // --- Status ---
    defineField({
      name: "provenStatus",
      title: "Proven Status",
      type: "boolean",
      description: "Has this methodology been shipped to clients 3+ times through the gatekeeper model?",
      initialValue: false,
    }),
    defineField({
      name: "provenDate",
      title: "Proven Date",
      type: "date",
    }),
    defineField({
      name: "version",
      title: "Version",
      type: "number",
      initialValue: 1,
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "string",
    }),
    defineField({
      name: "validatedBy",
      title: "Validated By",
      type: "string",
    }),
    defineField({
      name: "includeFeedbackPrompt",
      title: "Include feedback prompt",
      description: "When checked, appends the global 'Rate this Alexandria Tool' prompt as the final step of this methodology's MCP response.",
      type: "boolean",
      initialValue: false,
    }),
  ],

  preview: {
    select: {
      title: "name",
      practice: "practice.name",
      ai: "aiClassification",
      proven: "provenStatus",
    },
    prepare({ title, practice, ai, proven }: { title: string; practice?: string; ai?: string; proven?: boolean }) {
      const aiLabel: Record<string, string> = {
        ai_led: "AI-Led",
        ai_assisted: "AI-Assisted",
        human_led: "Human-Led",
      };
      return {
        title: `${proven ? "✓ " : ""}${title}`,
        subtitle: [practice ?? "Agency-Wide", ai ? aiLabel[ai] : ""].filter(Boolean).join(" — "),
      };
    },
  },
});
