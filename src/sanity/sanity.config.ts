import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { presentationTool } from "sanity/presentation";
import { schemaTypes } from "./schemas";
import StudioLogo from "./studio/logo";

const siteUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default defineConfig({
  name: "jda-catalyst",
  title: "JDA Catalyst",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  icon: StudioLogo,
  plugins: [
    structureTool(),
    presentationTool({
      previewUrl: siteUrl,
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
});
