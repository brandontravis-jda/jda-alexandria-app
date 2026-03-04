import { defineType, defineField } from "sanity";

export default defineType({
  name: "textBlock",
  title: "Text Block",
  type: "object",
  fields: [
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "H4", value: "h4" },
            { title: "Quote", value: "blockquote" },
          ],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  defineField({
                    name: "href",
                    title: "URL",
                    type: "url",
                    validation: (rule) =>
                      rule.uri({ allowRelative: true }),
                  }),
                  defineField({
                    name: "blank",
                    title: "Open in New Tab",
                    type: "boolean",
                    initialValue: false,
                  }),
                ],
              },
            ],
          },
        },
      ],
    }),
  ],
  preview: {
    select: { body: "body" },
    prepare({ body }) {
      const text = body?.[0]?.children?.[0]?.text ?? "Text Block";
      return { title: text };
    },
  },
});
