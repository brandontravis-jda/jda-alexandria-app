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

const doc = {
  _id: "platformGuide",
  _type: "platformGuide",
  title: "Alexandria Platform Guide",
  platformIntro:
    "Alexandria is JDA's production intelligence layer. It gives you access to approved templates, methodologies, and client brand packages — all maintained centrally so your output stays consistent and on-brand.",
  canonicalEntryPrompts: [
    {
      _key: key(),
      label: "HTML Deliverable",
      prompt: "I need to build an HTML deliverable from Alexandria.",
    },
    {
      _key: key(),
      label: "Word Document",
      prompt: "I need to build a Word document from Alexandria.",
    },
    {
      _key: key(),
      label: "Post-Discovery Brief",
      prompt: "I need to run the Post-Discovery Brief methodology from Alexandria.",
    },
    {
      _key: key(),
      label: "Brand Package Extraction",
      prompt: "I need to run the Brand Package Extraction methodology from Alexandria.",
    },
  ],
  examplePrompts: [
    {
      _key: key(),
      useCase: "Board primer for a client — don't know which template yet",
      prompt:
        "I need to build an HTML deliverable from Alexandria. I have a discovery brief for Kanakuk. Let Alexandria guide me.",
    },
    {
      _key: key(),
      useCase: "Post-discovery brief from session notes",
      prompt:
        "I need to run the Post-Discovery Brief methodology from Alexandria. I'll paste my session notes after you pull the methodology.",
    },
    {
      _key: key(),
      useCase: "Extract brand package from a client website",
      prompt:
        "I need to run the Brand Package Extraction methodology from Alexandria. The client is Prolific — I'll share their website URL.",
    },
    {
      _key: key(),
      useCase: "Check what Alexandria can do before starting",
      prompt: "Can Alexandria build an RFP response?",
    },
  ],
};

const existing = await client.fetch(`*[_id == "platformGuide"][0]`);

if (existing) {
  console.log("platformGuide already exists — patching...");
  await client.patch("platformGuide").set(doc).commit();
} else {
  console.log("Creating platformGuide...");
  await client.createOrReplace(doc);
}

console.log("✅ platformGuide seeded.");
