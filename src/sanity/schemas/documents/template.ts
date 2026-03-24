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
          { title: "Editorial HTML — scrolling, immersive, single-file", value: "editorial-html" },
          { title: "Slideshow HTML — slide-by-slide, keyboard navigation", value: "slideshow-html" },
          { title: "Web Landing Page — traditional page structure", value: "web-landing-page" },
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

    // ── Claude-Readable Instructions ─────────────────────────────────────────
    defineField({
      name: "productionInstructions",
      title: "Production Instructions",
      type: "text",
      rows: 20,
      description: "Claude-readable markdown. What is fixed in this template, what is variable, how to adapt it to a client, how to inject the brand system. This is the core field Claude reads when producing a deliverable.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "useCases",
      title: "Use Cases",
      type: "text",
      rows: 4,
      description: "Plain language — when to use this template, what client situations it fits, what it is NOT for.",
    }),
    defineField({
      name: "featureList",
      title: "Feature List",
      type: "text",
      rows: 6,
      description: "What this template is capable of — animations, data viz, interactive sections, responsive behavior, print-ready output, etc. Shown to practitioners when browsing.",
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
  ],

  preview: {
    select: {
      title: "title",
      formatType: "formatType",
      status: "status",
    },
    prepare({ title, formatType, status }: { title: string; formatType?: string; status?: string }) {
      const formatLabels: Record<string, string> = {
        "editorial-html": "Editorial HTML",
        "slideshow-html": "Slideshow HTML",
        "web-landing-page": "Web Landing Page",
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
