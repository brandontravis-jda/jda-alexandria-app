/**
 * Sanity full backup — exports all documents as JSON per-type
 * and a combined dump to backups/sanity-export-<date>/
 *
 * Usage: npx tsx scripts/backup-sanity.ts
 */

import { readFileSync } from "fs";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Load .env.local manually (no dotenv dep)
const envContent = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 0) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

import { createClient } from "next-sanity";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const TYPES = [
  "practiceArea",
  "productionMethodology",
  "clientBrandPackage",
  "template",
  "deliverableClassification",
  "platformGuide",
  "capabilityRecord",
];

async function main() {
  const date = new Date().toISOString().slice(0, 10);
  const dir = join(process.cwd(), "backups", `sanity-export-${date}`);
  mkdirSync(dir, { recursive: true });

  const allDocs: Record<string, unknown>[] = [];

  for (const type of TYPES) {
    console.log(`Fetching ${type}...`);
    const docs = await client.fetch<Record<string, unknown>[]>(
      `*[_type == "${type}"] | order(_createdAt asc)`
    );
    console.log(`  → ${docs.length} documents`);

    writeFileSync(
      join(dir, `${type}.json`),
      JSON.stringify(docs, null, 2)
    );
    allDocs.push(...docs);
  }

  writeFileSync(
    join(dir, "all-documents.json"),
    JSON.stringify(allDocs, null, 2)
  );

  console.log(`\nBackup complete: ${allDocs.length} total documents → ${dir}`);
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
