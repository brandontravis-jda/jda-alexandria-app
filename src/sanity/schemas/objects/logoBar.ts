import { defineType, defineField } from "sanity";

export default defineType({
  name: "logoBar",
  title: "Logo Bar",
  type: "object",
  fields: [
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
    }),
    defineField({
      name: "logos",
      title: "Logos",
      type: "array",
      of: [
        {
          type: "image",
          fields: [
            defineField({
              name: "alt",
              title: "Alt Text (Company Name)",
              type: "string",
              validation: (rule) => rule.required(),
            }),
          ],
        },
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: { title: "heading", logos: "logos" },
    prepare({ title, logos }) {
      return {
        title: title || "Logo Bar",
        subtitle: `${logos?.length ?? 0} logos`,
      };
    },
  },
});
