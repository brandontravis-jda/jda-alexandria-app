import { defineType, defineField } from "sanity";

export default defineType({
  name: "imageGallery",
  title: "Image Gallery",
  type: "object",
  fields: [
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              title: "Alt Text",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "caption",
              title: "Caption",
              type: "string",
            }),
          ],
        },
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: { images: "images" },
    prepare({ images }) {
      return {
        title: "Image Gallery",
        subtitle: `${images?.length ?? 0} images`,
      };
    },
  },
});
