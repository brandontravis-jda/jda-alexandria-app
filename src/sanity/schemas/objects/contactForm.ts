import { defineType, defineField } from "sanity";

export default defineType({
  name: "contactForm",
  title: "Contact Form",
  type: "object",
  fields: [
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "recipientEmail",
      title: "Recipient Email",
      type: "string",
      description: "Form submissions will be sent to this address",
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "successMessage",
      title: "Success Message",
      type: "string",
      initialValue: "Thank you! Your message has been sent.",
    }),
  ],
  preview: {
    select: { title: "heading" },
    prepare({ title }) {
      return { title: title || "Contact Form", subtitle: "Contact Form" };
    },
  },
});
