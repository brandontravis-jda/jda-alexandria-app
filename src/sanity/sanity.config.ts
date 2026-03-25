import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemas";
import { structure } from "./lib/structure";
import StudioLogo from "./studio/logo";
import { DownloadAsMarkdown } from "./studio/actions/DownloadAsMarkdown";

export default defineConfig({
  basePath: "/studio",
  name: "alexandria",
  title: "Alexandria",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  icon: StudioLogo,
  plugins: [
    structureTool({ structure }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
  document: {
    actions: (prev) => [...prev, DownloadAsMarkdown],
  },
});
