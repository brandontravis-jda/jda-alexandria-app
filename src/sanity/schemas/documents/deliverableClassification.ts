import { defineField, defineType } from "sanity";

export default defineType({
  name: "deliverableClassification",
  title: "Deliverable Classification",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name" },
      validation: (R) => R.required(),
    }),
    defineField({
      name: "practiceArea",
      title: "Practice Area",
      type: "reference",
      to: [{ type: "practiceArea" }],
    }),
    defineField({
      name: "aiClassification",
      title: "AI Classification",
      type: "string",
      options: {
        list: [
          { title: "AI-Led", value: "ai_led" },
          { title: "AI-Assisted", value: "ai_assisted" },
          { title: "Human-Led", value: "human_led" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "aiClassification",
    },
  },
});
