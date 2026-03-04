import { defineType, defineField } from "sanity";

export default defineType({
  name: "teamGrid",
  title: "Team Grid",
  type: "object",
  fields: [
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
    }),
    defineField({
      name: "members",
      title: "Team Members",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "teamMember" }],
        },
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: { title: "heading", members: "members" },
    prepare({ title, members }) {
      return {
        title: title || "Team Grid",
        subtitle: `${members?.length ?? 0} members`,
      };
    },
  },
});
