import { defineField, defineType } from "sanity";

const PRACTICE_AREAS = [
  { title: "Brand Creative", value: "Brand Creative" },
  { title: "Campaign and Production Creative", value: "Campaign and Production Creative" },
  { title: "Digital Marketing, Social, Email and Data", value: "Digital Marketing, Social, Email and Data" },
  { title: "Development", value: "Development" },
  { title: "Strategic Communications, PR and Crisis Comms", value: "Strategic Communications, PR and Crisis Comms" },
  { title: "Paid Media and Search", value: "Paid Media and Search" },
  { title: "Business Development", value: "Business Development" },
  { title: "Account Services", value: "Account Services" },
  { title: "Operations", value: "Operations" },
  { title: "Logistics", value: "Logistics" },
];

export default defineType({
  name: "capabilityRecord",
  title: "Capability Record",
  type: "document",
  fields: [
    // --- Identity ---
    defineField({
      name: "deliverableName",
      title: "Deliverable Name",
      type: "string",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "deliverableName" },
      validation: (R) => R.required(),
    }),
    defineField({
      name: "practiceArea",
      title: "Practice Area",
      type: "string",
      options: { list: PRACTICE_AREAS },
      validation: (R) => R.required(),
    }),

    // --- Status + Classification ---
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Not Evaluated", value: "not_evaluated" },
          { title: "Classified", value: "classified" },
          { title: "Methodology Built", value: "methodology_built" },
          { title: "Proven Status", value: "proven_status" },
        ],
        layout: "radio",
      },
      initialValue: "not_evaluated",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "aiClassification",
      title: "AI Classification",
      type: "string",
      options: {
        list: [
          { title: "AI-Led — AI generates primary output, human reviews and approves", value: "ai_led" },
          { title: "AI-Assisted — Human leads, AI accelerates specific stages", value: "ai_assisted" },
          { title: "Human-Led — Human judgment is primary, AI supports upstream", value: "human_led" },
        ],
        layout: "radio",
      },
      description: "Required when status is Classified or beyond.",
    }),

    // --- Methodology Link ---
    defineField({
      name: "linkedMethodology",
      title: "Linked Methodology",
      type: "reference",
      to: [{ type: "productionMethodology" }],
      description: "Required for records at Methodology Built status or beyond.",
    }),

    // --- Capability Assessment (Human-Led and AI-Assisted) ---
    defineField({
      name: "currentAiCeiling",
      title: "Current AI Ceiling",
      type: "text",
      rows: 4,
      description: "Honest assessment of what AI cannot yet do reliably for this deliverable type. Required for Human-Led and AI-Assisted.",
    }),
    defineField({
      name: "aiSupportRole",
      title: "AI Support Role",
      type: "text",
      rows: 4,
      description: "What Claude can do to support the human leading this work — research, drafting upstream, structuring outputs, etc.",
    }),
    defineField({
      name: "recommendedToolStack",
      title: "Recommended Tool Stack",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "ceilingLastReviewed",
      title: "Ceiling Last Reviewed",
      type: "datetime",
      description: "When was the AI ceiling assessment last reviewed by a human? Claude uses this to flag stale assessments.",
    }),
    defineField({
      name: "liveSearchEnabled",
      title: "Enable Live Search Supplement",
      type: "boolean",
      description: "When true, Claude performs a web search for current tool capability before returning the capability assessment.",
      initialValue: false,
    }),

    // --- Production Time ---
    defineField({
      name: "baselineProductionTime",
      title: "Baseline Production Time (Legacy)",
      type: "string",
      description: 'Legacy production time from Discovery Intensive. Example: "4–6 hours"',
    }),
    defineField({
      name: "aiNativeProductionTime",
      title: "AI-Native Production Time",
      type: "string",
      description: "Observed production time using AI-native workflow. Populated after Proven Status.",
    }),

    // --- Proven Status Tracking ---
    defineField({
      name: "provenStatusAchievedAt",
      title: "Proven Status Achieved At",
      type: "datetime",
    }),

    // --- Source Tracking ---
    defineField({
      name: "source",
      title: "Data Source",
      type: "string",
      options: {
        list: [
          { title: "KIRU Case Study", value: "kiru_case_study" },
          { title: "Asana History", value: "asana_history" },
          { title: "Discovery Intensive", value: "discovery_intensive" },
          { title: "Practice Leader Input", value: "practice_leader_input" },
          { title: "Manual", value: "manual" },
          { title: "Capability Gap Log", value: "capability_gap_log" },
        ],
      },
      description: "How this record was identified.",
    }),
    defineField({
      name: "notes",
      title: "Notes",
      type: "text",
      rows: 3,
    }),
  ],

  preview: {
    select: {
      title: "deliverableName",
      practiceArea: "practiceArea",
      status: "status",
      aiClassification: "aiClassification",
    },
    prepare({ title, practiceArea, status, aiClassification }: Record<string, string>) {
      const statusIcon: Record<string, string> = {
        not_evaluated: "○",
        classified: "◐",
        methodology_built: "●",
        proven_status: "✓",
      };
      const aiLabel: Record<string, string> = {
        ai_led: "AI-Led",
        ai_assisted: "AI-Assisted",
        human_led: "Human-Led",
      };
      return {
        title: `${statusIcon[status] ?? "○"} ${title}`,
        subtitle: [practiceArea, aiClassification ? aiLabel[aiClassification] : "Not Classified"]
          .filter(Boolean)
          .join(" — "),
      };
    },
  },
});
