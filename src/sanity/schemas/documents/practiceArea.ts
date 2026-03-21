import { defineField, defineType } from "sanity";

export default defineType({
  name: "practiceArea",
  title: "Practice Area",
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
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "activationStatus",
      title: "Activation Status",
      type: "string",
      options: {
        list: [
          { title: "Not Started", value: "not_started" },
          { title: "In Discovery", value: "in_discovery" },
          { title: "Activating", value: "activating" },
          { title: "Active", value: "active" },
        ],
        layout: "radio",
      },
      initialValue: "not_started",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "activationStatus" },
  },
});
