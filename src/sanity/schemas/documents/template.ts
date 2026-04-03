import { defineField, defineType } from "sanity";

export default defineType({
  name: "template",
  title: "Template",
  type: "document",
  fields: [
    // ── Core Identity ────────────────────────────────────────────────────────
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Human-readable name (e.g. 'Scrolling Editorial Presentation', 'JDA Document Style')",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      description: "Machine-readable identifier used in MCP tool calls (e.g. 'scrolling-editorial-presentation')",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "formatType",
      title: "Format Type",
      type: "string",
      description: "The production format — determines how Claude uses this template.",
      options: {
        list: [
          { title: "HTML Deliverable — scroll, slide, or tabbed; all HTML formats", value: "html-deliverable" },
          { title: "Word Document — .docx reference file", value: "word-document" },
          { title: "HTML Email — branded email template", value: "html-email" },
        ],
        layout: "radio",
      },
      validation: (R) => R.required(),
    }),

    // ── Source Files ─────────────────────────────────────────────────────────
    defineField({
      name: "previewUrl",
      title: "Preview URL",
      type: "url",
      description: "Live deployed example practitioners can view before selecting this template.",
    }),
    defineField({
      name: "githubRawUrl",
      title: "GitHub Raw URL",
      type: "url",
      description: "Raw GitHub URL to the base HTML file. Claude fetches this as a structural starting point. HTML format types only.",
    }),
    defineField({
      name: "dropboxLink",
      title: "Dropbox Link",
      type: "url",
      description: "Link to the base .docx or asset file in Dropbox. Document format types only.",
    }),

    // ── Discovery / Browsing ─────────────────────────────────────────────────
    defineField({
      name: "useCases",
      title: "Use Cases",
      type: "text",
      rows: 4,
      description: "When to use this template and when NOT to. Plain language — a practitioner reads this to decide if it fits their project.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "featureList",
      title: "Feature List",
      type: "text",
      rows: 5,
      description: "What this template is capable of — animations, data viz, interactive sections, responsive behavior, print-ready output, multi-column layouts, etc. Shown when browsing so practitioners pick the right format.",
    }),

    // ── Production Instructions (structured) ─────────────────────────────────
    // Separated into discrete fields so Claude cannot skip a section.
    // The MCP tool assembles these into a single context block.
    defineField({
      name: "fixedElements",
      title: "Fixed Elements",
      type: "text",
      rows: 6,
      description: "What is locked in this template and must not be changed — structure, navigation patterns, section order, interaction model, typography scale, spacing system. Claude treats these as non-negotiable.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "variableElements",
      title: "Variable Elements",
      type: "text",
      rows: 6,
      description: "What changes per project — copy, imagery, colors, client logo, section content, data, statistics. Claude fills these in from the brief and brand package.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "brandInjectionRules",
      title: "Brand Injection Rules",
      type: "text",
      rows: 6,
      description: "Exactly how the client brand system maps into this template — where primary colors go, which font roles map to which template roles, how logo is placed, how voice and tone apply to copy sections. This is the highest-stakes field: wrong brand injection produces client-facing errors.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "clientAdaptationNotes",
      title: "Client Adaptation Notes",
      type: "text",
      rows: 5,
      description: "How to tailor this template to different client types, industries, or project sizes. Edge cases, common modifications, things that break if you change them.",
    }),
    defineField({
      name: "outputSpec",
      title: "Output Specification",
      type: "text",
      rows: 4,
      description: "What the finished deliverable looks like — file format, how to deliver it, how to share it with the client, any developer handoff notes.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "qualityChecks",
      title: "Quality Checks",
      type: "text",
      rows: 5,
      description: "What Claude must verify before presenting the output — brand accuracy, completeness, structural integrity, copy fit, no placeholder text remaining. Same pattern as methodology quality checks.",
    }),

    // ── Relationships ────────────────────────────────────────────────────────
    defineField({
      name: "practiceAreas",
      title: "Practice Areas",
      type: "array",
      of: [{ type: "reference", to: [{ type: "practiceArea" }] }],
      description: "Which practices this template applies to. Leave empty for agency-wide templates.",
    }),
    defineField({
      name: "relatedMethodologies",
      title: "Related Methodologies",
      type: "array",
      of: [{ type: "reference", to: [{ type: "productionMethodology" }] }],
      description: "Methodologies that reference or produce output using this template.",
    }),

    // ── Status ───────────────────────────────────────────────────────────────
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Draft — not ready for practitioners", value: "draft" },
          { title: "Active — available to practitioners", value: "active" },
          { title: "Deprecated — replaced by a newer template", value: "deprecated" },
        ],
        layout: "radio",
      },
      initialValue: "draft",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "includeFeedbackPrompt",
      title: "Include feedback prompt",
      description: "When checked, appends the global 'Rate this Alexandria Tool' prompt as the final step of this template's MCP response.",
      type: "boolean",
      initialValue: false,
    }),
  ],

  preview: {
    select: {
      title: "title",
      formatType: "formatType",
      status: "status",
    },
    prepare({ title, formatType, status }: { title: string; formatType?: string; status?: string }) {
      const formatLabels: Record<string, string> = {
        "html-deliverable": "HTML Deliverable",
        "word-document": "Word Document",
        "html-email": "HTML Email",
      };
      const statusIcon = status === "active" ? "✓" : status === "deprecated" ? "✗" : "○";
      return {
        title,
        subtitle: `${statusIcon} ${formatLabels[formatType ?? ""] ?? formatType ?? "—"}`,
      };
    },
  },
});
