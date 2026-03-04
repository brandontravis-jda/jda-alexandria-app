import { defineType, defineField } from "sanity";

export default defineType({
  name: "videoEmbed",
  title: "Video Embed",
  type: "object",
  fields: [
    defineField({
      name: "url",
      title: "Video URL",
      type: "url",
      description: "YouTube or Vimeo URL",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "poster",
      title: "Poster Image",
      type: "image",
      description: "Custom thumbnail (optional — falls back to provider default)",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
    }),
  ],
  preview: {
    select: { url: "url" },
    prepare({ url }) {
      return { title: "Video Embed", subtitle: url };
    },
  },
});
