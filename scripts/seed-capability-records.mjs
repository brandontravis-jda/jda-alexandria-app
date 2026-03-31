import { createClient } from "@sanity/client";
import { randomUUID } from "crypto";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const key = () => randomUUID().slice(0, 8);

// Deliverable inventory extracted from KIRU case study.
// All records seed as not_evaluated — Discovery Intensives move them forward.
const deliverables = [
  // Brand Strategy
  { deliverableName: "Brand Positioning and Concept Development", practiceArea: "Brand Strategy" },
  { deliverableName: "Competitive Analysis", practiceArea: "Brand Strategy" },
  { deliverableName: "Audience Persona Development", practiceArea: "Brand Strategy" },
  { deliverableName: "Brand Messaging Framework", practiceArea: "Brand Strategy" },
  { deliverableName: "Brand Voice and Tone Documentation", practiceArea: "Brand Strategy" },

  // Brand Identity
  { deliverableName: "Visual Identity System", practiceArea: "Brand Identity" },
  { deliverableName: "Logo System", practiceArea: "Brand Identity" },
  { deliverableName: "Brand Guidelines Documentation", practiceArea: "Brand Identity" },

  // Development
  { deliverableName: "Website Strategy and Information Architecture", practiceArea: "Development" },
  { deliverableName: "Website Specification and Content Brief", practiceArea: "Development" },
  { deliverableName: "Full-Stack Website Build", practiceArea: "Development" },
  { deliverableName: "Online Ordering System", practiceArea: "Development" },
  { deliverableName: "Reservation System", practiceArea: "Development" },
  { deliverableName: "Loyalty Program", practiceArea: "Development" },
  { deliverableName: "Admin Dashboard and CRM", practiceArea: "Development" },

  // Copy and Content
  { deliverableName: "Website Copy — Full Site", practiceArea: "Copy and Content" },
  { deliverableName: "Email Sequence Copy", practiceArea: "Copy and Content" },
  { deliverableName: "Social Media Copy and Calendar", practiceArea: "Copy and Content" },
  { deliverableName: "Ad Copy — Multi-Platform Variants", practiceArea: "Copy and Content" },
  { deliverableName: "In-Restaurant Collateral Copy", practiceArea: "Copy and Content" },
  { deliverableName: "Menu Development and Copy", practiceArea: "Copy and Content" },

  // Email
  { deliverableName: "Branded HTML Email Templates", practiceArea: "Email" },
  { deliverableName: "Triggered Email System", practiceArea: "Email" },

  // PR
  { deliverableName: "Press Release", practiceArea: "PR" },
  { deliverableName: "Media Pitch Variants", practiceArea: "PR" },
  { deliverableName: "Media Target List", practiceArea: "PR" },
  { deliverableName: "Founder Fact Sheet and Talking Points", practiceArea: "PR" },
  { deliverableName: "Crisis Communications Framework", practiceArea: "PR" },

  // Paid Media
  { deliverableName: "Paid Media Strategy — Multi-Channel", practiceArea: "Paid Media" },
  { deliverableName: "Ad Creative Briefs", practiceArea: "Paid Media" },
  { deliverableName: "KPI Framework and Attribution Model", practiceArea: "Paid Media" },

  // Social and Community
  { deliverableName: "Social Media Content Calendar", practiceArea: "Social and Community" },
  { deliverableName: "Community Management Playbook", practiceArea: "Social and Community" },
  { deliverableName: "Influencer Outreach Strategy and Templates", practiceArea: "Social and Community" },
  { deliverableName: "UGC Guidelines", practiceArea: "Social and Community" },

  // Video and Animation
  { deliverableName: "Brand Video — Concept, Script, Production", practiceArea: "Video and Animation" },
  { deliverableName: "Logo Animation", practiceArea: "Video and Animation" },
  { deliverableName: "Social Video Clips", practiceArea: "Video and Animation" },

  // Photography and Imagery
  { deliverableName: "Brand Photography Direction and Prompts", practiceArea: "Photography and Imagery" },
  { deliverableName: "Food and Product Photography Direction", practiceArea: "Photography and Imagery" },
  { deliverableName: "Environmental and Lifestyle Imagery Direction", practiceArea: "Photography and Imagery" },
];

function makeSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

let created = 0;
let skipped = 0;

for (const d of deliverables) {
  const slug = makeSlug(d.deliverableName);

  // Check if already exists
  const existing = await client.fetch(
    `*[_type == "capabilityRecord" && slug.current == $slug][0]{ _id }`,
    { slug }
  );

  if (existing) {
    console.log(`  skip  ${d.deliverableName}`);
    skipped++;
    continue;
  }

  await client.create({
    _type: "capabilityRecord",
    deliverableName: d.deliverableName,
    slug: { _type: "slug", current: slug },
    practiceArea: d.practiceArea,
    status: "not_evaluated",
    source: "kiru_case_study",
  });

  console.log(`  ✅    ${d.deliverableName}`);
  created++;
}

console.log(`\nDone. Created: ${created}  Skipped (already exists): ${skipped}`);
