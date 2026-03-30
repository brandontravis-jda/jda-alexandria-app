import { defineField, defineType } from "sanity";

export default defineType({
  name: "platformGuide",
  title: "Platform Guide",
  type: "document",
  __experimental_actions: ["update", "publish"],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      initialValue: "Alexandria Platform Guide",
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: "platformIntro",
      title: "Platform Introduction",
      description: "One or two sentences describing what Alexandria is. Shown as the opening line of alexandria_help responses.",
      type: "text",
      rows: 3,
      validation: (R) => R.required(),
    }),
    defineField({
      name: "canonicalEntryPrompts",
      title: "Canonical Entry Prompts",
      description: "The recommended opening prompts practitioners should use to start production jobs. Shown verbatim in alexandria_help.",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              description: "Short label, e.g. HTML Deliverable",
              validation: (R) => R.required(),
            }),
            defineField({
              name: "prompt",
              title: "Prompt Text",
              type: "string",
              description: 'The verbatim prompt string, e.g. "I need to build an HTML deliverable from Alexandria."',
              validation: (R) => R.required(),
            }),
          ],
          preview: { select: { title: "label", subtitle: "prompt" } },
        },
      ],
    }),
    defineField({
      name: "examplePrompts",
      title: "Example Prompts",
      description: "Common use-case examples shown in alexandria_help. All must follow the generic entry pattern — no client names or content in the opening line.",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "useCase",
              title: "Use Case",
              type: "string",
              description: "Short description of what this example demonstrates.",
              validation: (R) => R.required(),
            }),
            defineField({
              name: "prompt",
              title: "Example Prompt",
              type: "text",
              rows: 2,
              validation: (R) => R.required(),
            }),
          ],
          preview: { select: { title: "useCase", subtitle: "prompt" } },
        },
      ],
    }),
  ],
  preview: {
    select: { title: "title" },
    prepare: () => ({ title: "Alexandria Platform Guide" }),
  },
});
