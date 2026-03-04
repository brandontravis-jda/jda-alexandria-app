import { defineType, defineField } from "sanity";

export default defineType({
  name: "link",
  title: "Link",
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
  ],
});
