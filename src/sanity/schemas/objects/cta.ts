import { defineType, defineField } from "sanity";

export default defineType({
  name: "cta",
  title: "Call to Action",
  type: "object",
  fields: [
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      title: "Body Text",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "primaryButton",
      title: "Primary Button",
      type: "link",
    }),
    defineField({
      name: "secondaryButton",
      title: "Secondary Button",
      type: "link",
    }),
    defineField({
      name: "backgroundColor",
      title: "Background Style",
      type: "string",
      options: {
        list: [
          { title: "Default", value: "default" },
          { title: "Brand Primary", value: "primary" },
          { title: "Surface", value: "surface" },
        ],
      },
      initialValue: "default",
    }),
  ],
  preview: {
    select: { title: "heading" },
    prepare({ title }) {
      return { title: title || "CTA", subtitle: "Call to Action" };
    },
  },
});
