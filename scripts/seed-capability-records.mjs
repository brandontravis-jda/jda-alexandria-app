import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

// JDA practice area taxonomy
const PA = {
  BRAND:     "Brand Creative",
  CAMPAIGN:  "Campaign and Production Creative",
  DIGITAL:   "Digital Marketing, Social, Email and Data",
  DEV:       "Development",
  COMMS:     "Strategic Communications, PR and Crisis Comms",
  PAID:      "Paid Media and Search",
  BD:        "Business Development",
  ACCOUNT:   "Account Services",
  OPS:       "Operations",
  LOGISTICS: "Logistics",
};

// Full deliverable inventory. Source field = how it was identified.
const deliverables = [
  // ── Brand Creative ────────────────────────────────────────────────────────
  { deliverableName: "Brand Positioning and Concept Development",    practiceArea: PA.BRAND },
  { deliverableName: "Competitive Analysis",                          practiceArea: PA.BRAND },
  { deliverableName: "Audience Persona Development",                  practiceArea: PA.BRAND },
  { deliverableName: "Brand Messaging Framework",                     practiceArea: PA.BRAND },
  { deliverableName: "Brand Voice and Tone Documentation",            practiceArea: PA.BRAND },
  { deliverableName: "Visual Identity System",                        practiceArea: PA.BRAND },
  { deliverableName: "Logo System",                                   practiceArea: PA.BRAND },
  { deliverableName: "Brand Guidelines Documentation",                practiceArea: PA.BRAND },
  { deliverableName: "Brand Architecture",                            practiceArea: PA.BRAND },
  { deliverableName: "Brand Naming",                                  practiceArea: PA.BRAND },

  // ── Campaign and Production Creative ─────────────────────────────────────
  { deliverableName: "Campaign Concept Development",                  practiceArea: PA.CAMPAIGN },
  { deliverableName: "Ad Creative Briefs",                            practiceArea: PA.CAMPAIGN },
  { deliverableName: "Ad Copy — Multi-Platform Variants",             practiceArea: PA.CAMPAIGN },
  { deliverableName: "Brand Video — Concept, Script, Production",    practiceArea: PA.CAMPAIGN },
  { deliverableName: "Social Video Clips",                            practiceArea: PA.CAMPAIGN },
  { deliverableName: "Logo Animation",                                practiceArea: PA.CAMPAIGN },
  { deliverableName: "Brand Photography Direction and Prompts",       practiceArea: PA.CAMPAIGN },
  { deliverableName: "Food and Product Photography Direction",        practiceArea: PA.CAMPAIGN },
  { deliverableName: "Environmental and Lifestyle Imagery Direction", practiceArea: PA.CAMPAIGN },
  { deliverableName: "In-Person Event and Collateral Concepting",    practiceArea: PA.CAMPAIGN },

  // ── Digital Marketing, Social, Email and Data ─────────────────────────────
  { deliverableName: "Social Media Content Calendar",                 practiceArea: PA.DIGITAL },
  { deliverableName: "Social Media Copy",                             practiceArea: PA.DIGITAL },
  { deliverableName: "Community Management Playbook",                 practiceArea: PA.DIGITAL },
  { deliverableName: "Influencer Outreach Strategy and Templates",    practiceArea: PA.DIGITAL },
  { deliverableName: "UGC Guidelines",                                practiceArea: PA.DIGITAL },
  { deliverableName: "Branded HTML Email Templates",                  practiceArea: PA.DIGITAL },
  { deliverableName: "Triggered Email System",                        practiceArea: PA.DIGITAL },
  { deliverableName: "Email Sequence Copy",                           practiceArea: PA.DIGITAL },
  { deliverableName: "SMS Templates",                                 practiceArea: PA.DIGITAL },
  { deliverableName: "Analytics and Reporting Setup",                 practiceArea: PA.DIGITAL },
  { deliverableName: "Marketing Dashboard and KPI Framework",        practiceArea: PA.DIGITAL },

  // ── Development ───────────────────────────────────────────────────────────
  { deliverableName: "Website Strategy and Information Architecture", practiceArea: PA.DEV },
  { deliverableName: "Website Specification and Content Brief",      practiceArea: PA.DEV },
  { deliverableName: "Website Copy — Full Site",                     practiceArea: PA.DEV },
  { deliverableName: "Full-Stack Website Build",                     practiceArea: PA.DEV },
  { deliverableName: "Online Ordering System",                       practiceArea: PA.DEV },
  { deliverableName: "Reservation System",                           practiceArea: PA.DEV },
  { deliverableName: "Loyalty Program",                              practiceArea: PA.DEV },
  { deliverableName: "Admin Dashboard and CRM",                      practiceArea: PA.DEV },
  { deliverableName: "Menu Development and Copy",                    practiceArea: PA.DEV },
  { deliverableName: "In-Restaurant and Physical Collateral Copy",   practiceArea: PA.DEV },

  // ── Strategic Communications, PR and Crisis Comms ─────────────────────────
  { deliverableName: "Press Release",                                 practiceArea: PA.COMMS },
  { deliverableName: "Media Pitch Variants",                          practiceArea: PA.COMMS },
  { deliverableName: "Media Target List",                             practiceArea: PA.COMMS },
  { deliverableName: "Founder Fact Sheet and Talking Points",         practiceArea: PA.COMMS },
  { deliverableName: "Crisis Communications Framework",               practiceArea: PA.COMMS },
  { deliverableName: "Executive Communications and Ghostwriting",     practiceArea: PA.COMMS },
  { deliverableName: "Thought Leadership Content",                    practiceArea: PA.COMMS },
  { deliverableName: "Internal Communications",                       practiceArea: PA.COMMS },

  // ── Paid Media and Search ─────────────────────────────────────────────────
  { deliverableName: "Paid Media Strategy — Multi-Channel",          practiceArea: PA.PAID },
  { deliverableName: "KPI Framework and Attribution Model",          practiceArea: PA.PAID },
  { deliverableName: "Google Search Campaign Setup",                 practiceArea: PA.PAID },
  { deliverableName: "Meta Ads Campaign Setup",                      practiceArea: PA.PAID },
  { deliverableName: "TikTok Ads Campaign Setup",                    practiceArea: PA.PAID },
  { deliverableName: "Programmatic Display Campaign",                practiceArea: PA.PAID },
  { deliverableName: "SEO Strategy and Audit",                       practiceArea: PA.PAID },

  // ── Business Development ──────────────────────────────────────────────────
  { deliverableName: "RFP Response",                                  practiceArea: PA.BD },
  { deliverableName: "Client Proposal",                               practiceArea: PA.BD },
  { deliverableName: "Capabilities Deck",                             practiceArea: PA.BD },
  { deliverableName: "Case Study",                                    practiceArea: PA.BD },
  { deliverableName: "Scope of Work",                                 practiceArea: PA.BD },
  { deliverableName: "New Business Research and Prospecting",        practiceArea: PA.BD },

  // ── Account Services ──────────────────────────────────────────────────────
  { deliverableName: "Client Onboarding Brief",                       practiceArea: PA.ACCOUNT },
  { deliverableName: "Weekly Status Report",                          practiceArea: PA.ACCOUNT },
  { deliverableName: "Post-Discovery Brief",                          practiceArea: PA.ACCOUNT },
  { deliverableName: "Pre-Discovery Brief",                           practiceArea: PA.ACCOUNT },
  { deliverableName: "Client Strategy Brief",                         practiceArea: PA.ACCOUNT },
  { deliverableName: "Project Retrospective",                         practiceArea: PA.ACCOUNT },
  { deliverableName: "Meeting Notes and Action Items",                practiceArea: PA.ACCOUNT },

  // ── Operations ────────────────────────────────────────────────────────────
  { deliverableName: "Process Documentation",                         practiceArea: PA.OPS },
  { deliverableName: "Standard Operating Procedure",                  practiceArea: PA.OPS },
  { deliverableName: "Team Onboarding Materials",                     practiceArea: PA.OPS },
  { deliverableName: "Workflow Mapping and Optimization",             practiceArea: PA.OPS },

  // ── Logistics ─────────────────────────────────────────────────────────────
  { deliverableName: "Executive Office Communications",               practiceArea: PA.LOGISTICS },
  { deliverableName: "HR Policy Documentation",                       practiceArea: PA.LOGISTICS },
  { deliverableName: "IT Systems Documentation",                      practiceArea: PA.LOGISTICS },
  { deliverableName: "Finance and Billing Communications",            practiceArea: PA.LOGISTICS },
  { deliverableName: "Vendor Contract and Procurement Documentation", practiceArea: PA.LOGISTICS },
];

function makeSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Delete all existing capability records first, then reseed
console.log("Deleting existing capability records...");
const existing = await client.fetch(`*[_type == "capabilityRecord"]{ _id }`);
if (existing.length > 0) {
  const transaction = client.transaction();
  for (const doc of existing) transaction.delete(doc._id);
  await transaction.commit();
  console.log(`  Deleted ${existing.length} existing records.`);
}

console.log(`\nSeeding ${deliverables.length} capability records...\n`);

let created = 0;
for (const d of deliverables) {
  const slug = makeSlug(d.deliverableName);
  await client.create({
    _type: "capabilityRecord",
    deliverableName: d.deliverableName,
    slug: { _type: "slug", current: slug },
    practiceArea: d.practiceArea,
    status: "not_evaluated",
    source: "kiru_case_study",
  });
  console.log(`  ✅  [${d.practiceArea}] ${d.deliverableName}`);
  created++;
}

console.log(`\nDone. ${created} records created.`);
