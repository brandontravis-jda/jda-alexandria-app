import { defineType, defineArrayMember } from "sanity";

export default defineType({
  name: "pageBuilder",
  title: "Page Builder",
  type: "array",
  of: [
    defineArrayMember({ type: "hero" }),
    defineArrayMember({ type: "textBlock" }),
    defineArrayMember({ type: "cta" }),
    defineArrayMember({ type: "featureGrid" }),
    defineArrayMember({ type: "statsCounter" }),
    defineArrayMember({ type: "logoBar" }),
    defineArrayMember({ type: "imageGallery" }),
    defineArrayMember({ type: "videoEmbed" }),
    defineArrayMember({ type: "testimonials" }),
    defineArrayMember({ type: "faq" }),
    defineArrayMember({ type: "teamGrid" }),
    defineArrayMember({ type: "contactForm" }),
  ],
});
