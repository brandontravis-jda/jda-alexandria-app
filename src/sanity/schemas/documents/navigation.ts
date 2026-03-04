import { defineType, defineField, defineArrayMember } from "sanity";

export default defineType({
  name: "navigation",
  title: "Navigation",
  type: "document",
  fields: [
    defineField({
      name: "items",
      title: "Navigation Items",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "url",
              title: "URL",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "isExternal",
              title: "Open in New Tab",
              type: "boolean",
              initialValue: false,
            }),
            defineField({
              name: "children",
              title: "Dropdown Items",
              type: "array",
              of: [{ type: "link" }],
            }),
          ],
          preview: {
            select: { title: "label", subtitle: "url" },
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: "Main Navigation" };
    },
  },
});
