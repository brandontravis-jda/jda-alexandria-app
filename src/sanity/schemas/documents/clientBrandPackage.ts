import { defineField, defineType } from "sanity";

export default defineType({
  name: "clientBrandPackage",
  title: "Client Brand Package",
  type: "document",
  fields: [
    // ── Core Identity ────────────────────────────────────────────────────────
    defineField({
      name: "clientName",
      title: "Client Name",
      type: "string",
      description: "Full organization name as it appears in the brand guide.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "clientName" },
      description: "Machine-readable identifier used in MCP tool calls (e.g. 'heartbeat-international').",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "abbreviations",
      title: "Abbreviations",
      type: "string",
      description: "Acceptable short names or acronyms (e.g. 'HBI', 'HI').",
    }),

    // ── Extraction Metadata ──────────────────────────────────────────────────
    defineField({
      name: "extractedDate",
      title: "Extracted Date",
      type: "date",
      description: "When this brand package was extracted from the source document.",
    }),
    defineField({
      name: "sourceDocument",
      title: "Source Document",
      type: "string",
      description: "Name or description of the brand guide this was extracted from (e.g. 'HBI Brand Standards 2023.pdf').",
    }),
    defineField({
      name: "extractedBy",
      title: "Extracted By",
      type: "string",
      description: "Practitioner who ran the extraction.",
    }),
    defineField({
      name: "gaps",
      title: "Extraction Gaps",
      type: "text",
      rows: 4,
      description: "Sections that were missing, thin, or incomplete in the source document. Flagged by Claude during extraction.",
    }),

    // ── Raw Markdown ─────────────────────────────────────────────────────────
    defineField({
      name: "rawMarkdown",
      title: "Full Brand Package (Markdown)",
      type: "text",
      rows: 30,
      description: "The complete extracted brand package as a single markdown file. This is what Alexandria serves to Claude. Under 5,000 words.",
      validation: (R) => R.required(),
    }),

    // ── Section 1: Identity ──────────────────────────────────────────────────
    defineField({
      name: "identity",
      title: "Identity",
      type: "object",
      fields: [
        defineField({ name: "tagline", title: "Tagline / Positioning Line", type: "string" }),
        defineField({ name: "brandPersonality", title: "Brand Personality", type: "string", description: "3-5 word descriptor (e.g. 'Authentic Servant Leader')" }),
        defineField({ name: "brandVoice", title: "Brand Voice", type: "string", description: "How the brand speaks (e.g. 'Inspired, Dignifying Expertise')" }),
        defineField({ name: "brandExperience", title: "Brand Experience", type: "string", description: "How interactions should feel (e.g. 'Active, Trusted Support')" }),
      ],
    }),

    // ── Section 2: Color Palette ─────────────────────────────────────────────
    defineField({
      name: "colorPalette",
      title: "Color Palette",
      type: "array",
      description: "Every named color from the brand guide with hex value and role.",
      of: [
        {
          type: "object",
          fields: [
            { name: "colorName", title: "Color Name", type: "string", validation: (R) => R.required() },
            { name: "hex", title: "Hex Value", type: "string", description: "e.g. #2D6A4F" },
            {
              name: "role",
              title: "Role",
              type: "string",
              options: {
                list: [
                  { title: "Primary", value: "primary" },
                  { title: "Secondary", value: "secondary" },
                  { title: "Accent", value: "accent" },
                  { title: "Background", value: "background" },
                  { title: "Avoid", value: "avoid" },
                ],
              },
            },
            { name: "usageNotes", title: "Usage Notes", type: "string" },
          ],
          preview: {
            select: { title: "colorName", subtitle: "hex" },
          },
        },
      ],
    }),
    defineField({
      name: "colorUsageRules",
      title: "Color Usage Rules",
      type: "text",
      rows: 3,
      description: "General rules like 'primary colors should make up 75% of usage', WCAG alternatives, etc.",
    }),

    // ── Section 3: Typography ────────────────────────────────────────────────
    defineField({
      name: "typography",
      title: "Typography",
      type: "object",
      fields: [
        defineField({ name: "headingFont", title: "Heading Font", type: "string", description: "Name, weights, sizing rules" }),
        defineField({ name: "bodyFont", title: "Body Font", type: "string", description: "Name, weights, sizing rules" }),
        defineField({ name: "accentFont", title: "Accent / Display Font", type: "string", description: "Name and usage restrictions" }),
        defineField({ name: "pairingRules", title: "Pairing Rules", type: "text", rows: 2 }),
        defineField({ name: "alignmentRules", title: "Alignment Rules", type: "string", description: "e.g. 'always left-align, never justify'" }),
        defineField({ name: "webFontAvailability", title: "Web Font Availability", type: "string", description: "Google Fonts / Adobe Fonts / Licensed / Custom / Unknown" }),
        defineField({ name: "officeAlternatives", title: "Office / Presentation Alternatives", type: "string", description: "Fallback fonts for PowerPoint, Word, etc." }),
      ],
    }),

    // ── Section 4: Voice and Tone ────────────────────────────────────────────
    defineField({
      name: "voiceAndTone",
      title: "Voice and Tone",
      type: "object",
      fields: [
        defineField({ name: "overallVoice", title: "Overall Voice", type: "text", rows: 3 }),
        defineField({ name: "toneByAudience", title: "Tone by Audience", type: "text", rows: 4, description: "Different tones for donors, general public, partners, clients, etc." }),
        defineField({ name: "toneByContext", title: "Tone by Context", type: "text", rows: 3, description: "Different tones for crisis, celebration, education, etc." }),
        defineField({ name: "wordsToUse", title: "Words and Phrases to Use", type: "text", rows: 4, description: "Preferred language with the incorrect alternatives they replace." }),
        defineField({ name: "wordsToAvoid", title: "Words and Phrases to Avoid", type: "text", rows: 4, description: "Restricted language with preferred alternatives." }),
        defineField({ name: "writingStyleRules", title: "Writing Style Rules", type: "text", rows: 3, description: "Contractions, pronouns, sentence structure, formality level, etc." }),
        defineField({ name: "verbalExamples", title: "Verbal Examples", type: "text", rows: 4, description: "2-3 short examples of reinforcing tone." }),
        defineField({ name: "underminingTraits", title: "Undermining Traits", type: "text", rows: 3, description: "What the brand must NOT sound like. Often more useful for AI than the positive traits." }),
      ],
    }),

    // ── Section 5: Brand Architecture ───────────────────────────────────────
    defineField({
      name: "brandArchitecture",
      title: "Brand Architecture",
      type: "object",
      fields: [
        defineField({ name: "parentAndSubBrands", title: "Parent Brand and Sub-brands", type: "text", rows: 3 }),
        defineField({ name: "linkageRules", title: "Linkage Rules", type: "text", rows: 3 }),
        defineField({ name: "endorsementRules", title: "Endorsement Rules", type: "text", rows: 3 }),
        defineField({ name: "criticalRestrictions", title: "Critical Restrictions (DO NOT rules)", type: "text", rows: 4, description: "High-stakes restrictions. Missing one could result in deliverables that cause real organizational harm." }),
      ],
    }),

    // ── Section 6: Visual Direction ──────────────────────────────────────────
    defineField({
      name: "visualDirection",
      title: "Visual Direction",
      type: "object",
      fields: [
        defineField({ name: "photographyStyle", title: "Photography Style", type: "text", rows: 3 }),
        defineField({ name: "imageryGuidelines", title: "Imagery Guidelines", type: "text", rows: 3, description: "Reinforcing vs. undermining visual qualities." }),
        defineField({ name: "layoutPrinciples", title: "Layout Principles", type: "text", rows: 3 }),
        defineField({ name: "logoUsageRules", title: "Logo Usage Rules", type: "text", rows: 4, description: "Primary vs. secondary lockups, minimum sizes, clear space, misuse rules. Text only — no embedded images." }),
      ],
    }),

    // ── Section 7: Key Messaging ─────────────────────────────────────────────
    defineField({
      name: "keyMessaging",
      title: "Key Messaging",
      type: "object",
      fields: [
        defineField({ name: "missionStatement", title: "Mission Statement", type: "text", rows: 2, description: "Exact text." }),
        defineField({ name: "visionStatement", title: "Vision Statement", type: "text", rows: 2, description: "Exact text." }),
        defineField({ name: "valueProposition", title: "Value Proposition", type: "text", rows: 2, description: "Exact text." }),
        defineField({ name: "elevatorSpeeches", title: "Elevator Speeches", type: "text", rows: 6, description: "All available lengths, verbatim." }),
        defineField({ name: "coreValues", title: "Core Values", type: "text", rows: 4 }),
        defineField({ name: "keyStatistics", title: "Key Statistics", type: "text", rows: 4, description: "Numbers the brand uses regularly. Include source date — statistics go stale." }),
        defineField({ name: "trademarkedNames", title: "Trademarked Names", type: "text", rows: 2, description: "Correct marks (® or ™) for each." }),
      ],
    }),
  ],

  preview: {
    select: {
      title: "clientName",
      slug: "slug.current",
      extractedDate: "extractedDate",
    },
    prepare({ title, slug, extractedDate }: { title: string; slug?: string; extractedDate?: string }) {
      return {
        title,
        subtitle: [slug, extractedDate].filter(Boolean).join(" — "),
      };
    },
  },
});
