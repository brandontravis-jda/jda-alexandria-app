/**
 * Migrates Sanity content from the JSON backup into Postgres.
 * Run AFTER the schema migration has been applied (migrate() creates tables).
 *
 * Usage: npx tsx scripts/migrate-sanity-to-postgres.ts
 */

import { readFileSync } from "fs";
import { join } from "path";

// Load .env.local
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

import { db } from "../src/lib/db";
import { migrate } from "../src/lib/schema";

const BACKUP_DIR = join(process.cwd(), "backups", "sanity-export-2026-06-04");

function readBackup(type: string): Record<string, unknown>[] {
  const raw = readFileSync(join(BACKUP_DIR, `${type}.json`), "utf-8");
  return JSON.parse(raw);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("Running schema migration...");
  await migrate();

  // ---- Practice Areas ----
  const practiceAreas = readBackup("practiceArea");
  console.log(`\nMigrating ${practiceAreas.length} practice areas...`);
  const practiceIdMap = new Map<string, number>(); // sanity_id -> postgres id

  for (const pa of practiceAreas) {
    const slug = pa.slug && typeof pa.slug === "object" ? (pa.slug as { current: string }).current : slugify(pa.name as string);
    const [row] = await db`
      INSERT INTO practices (name, slug, description, sanity_id, activation_status)
      VALUES (
        ${pa.name as string},
        ${slug},
        ${(pa.description as string) ?? null},
        ${pa._id as string},
        ${(pa.activationStatus as string) ?? "not_started"}
      )
      ON CONFLICT (slug) DO UPDATE SET
        sanity_id = EXCLUDED.sanity_id,
        description = COALESCE(EXCLUDED.description, practices.description),
        activation_status = EXCLUDED.activation_status
      RETURNING id
    `;
    practiceIdMap.set(pa._id as string, row.id as number);
    console.log(`  ✓ ${pa.name}`);
  }

  // ---- Methodologies ----
  const methodologies = readBackup("productionMethodology");
  console.log(`\nMigrating ${methodologies.length} methodologies...`);
  const methodologyIdMap = new Map<string, number>();

  for (const m of methodologies) {
    const slug = m.slug && typeof m.slug === "object" ? (m.slug as { current: string }).current : slugify(m.name as string);
    const practiceRef = m.practice as { _ref?: string } | null;
    const practiceId = practiceRef?._ref ? practiceIdMap.get(practiceRef._ref) ?? null : null;

    const [row] = await db`
      INSERT INTO methodologies (
        sanity_id, name, slug, description, practice_id, ai_classification,
        tools_involved, required_inputs, system_instructions, steps, output_format,
        quality_checks, failure_modes, vision_of_good, tips, client_refinements,
        quality_checklist, baseline_production_time, ai_native_production_time,
        proven_status, proven_date, version, author, validated_by, include_feedback_prompt
      ) VALUES (
        ${m._id as string},
        ${m.name as string},
        ${slug},
        ${(m.description as string) ?? ""},
        ${practiceId},
        ${(m.aiClassification as string) ?? null},
        ${(m.toolsInvolved as string[]) ?? []},
        ${JSON.stringify(m.requiredInputs ?? [])},
        ${(m.systemInstructions as string) ?? ""},
        ${JSON.stringify(m.steps ?? [])},
        ${(m.outputFormat as string) ?? ""},
        ${JSON.stringify(m.qualityChecks ?? [])},
        ${JSON.stringify(m.failureModes ?? [])},
        ${(m.visionOfGood as string) ?? ""},
        ${(m.tips as string) ?? ""},
        ${JSON.stringify(m.clientRefinements ?? [])},
        ${JSON.stringify(m.qualityChecklist ?? [])},
        ${(m.baselineProductionTime as string) ?? null},
        ${(m.aiNativeProductionTime as string) ?? null},
        ${(m.provenStatus as boolean) ?? false},
        ${(m.provenDate as string) ?? null},
        ${(m.version as number) ?? 1},
        ${(m.author as string) ?? null},
        ${(m.validatedBy as string) ?? null},
        ${(m.includeFeedbackPrompt as boolean) ?? false}
      )
      ON CONFLICT (slug) DO UPDATE SET
        sanity_id = EXCLUDED.sanity_id,
        description = EXCLUDED.description,
        practice_id = EXCLUDED.practice_id,
        updated_at = NOW()
      RETURNING id
    `;
    methodologyIdMap.set(m._id as string, row.id as number);
    console.log(`  ✓ ${m.name}`);
  }

  // ---- Templates ----
  const templates = readBackup("template");
  console.log(`\nMigrating ${templates.length} templates...`);
  const templateIdMap = new Map<string, number>();

  for (const t of templates) {
    const slug = t.slug && typeof t.slug === "object" ? (t.slug as { current: string }).current : slugify(t.title as string);

    const [row] = await db`
      INSERT INTO templates (
        sanity_id, title, slug, format_type, preview_url, github_raw_url, dropbox_link,
        use_cases, feature_list, fixed_elements, variable_elements, brand_injection_rules,
        client_adaptation_notes, output_spec, quality_checks, include_feedback_prompt, status
      ) VALUES (
        ${t._id as string},
        ${t.title as string},
        ${slug},
        ${(t.formatType as string) ?? null},
        ${(t.previewUrl as string) ?? null},
        ${(t.githubRawUrl as string) ?? null},
        ${(t.dropboxLink as string) ?? null},
        ${(t.useCases as string) ?? ""},
        ${(t.featureList as string) ?? ""},
        ${(t.fixedElements as string) ?? ""},
        ${(t.variableElements as string) ?? ""},
        ${(t.brandInjectionRules as string) ?? ""},
        ${(t.clientAdaptationNotes as string) ?? ""},
        ${(t.outputSpec as string) ?? ""},
        ${(t.qualityChecks as string) ?? ""},
        ${(t.includeFeedbackPrompt as boolean) ?? false},
        ${(t.status as string) ?? "draft"}
      )
      ON CONFLICT (slug) DO UPDATE SET
        sanity_id = EXCLUDED.sanity_id,
        updated_at = NOW()
      RETURNING id
    `;
    templateIdMap.set(t._id as string, row.id as number);

    // Practice area references
    const practiceRefs = (t.practiceAreas ?? []) as { _ref: string }[];
    for (const ref of practiceRefs) {
      const pId = practiceIdMap.get(ref._ref);
      if (pId) {
        await db`INSERT INTO template_practices (template_id, practice_id) VALUES (${row.id as number}, ${pId}) ON CONFLICT DO NOTHING`;
      }
    }

    // Methodology references
    const methRefs = (t.relatedMethodologies ?? []) as { _ref: string }[];
    for (const ref of methRefs) {
      const mId = methodologyIdMap.get(ref._ref);
      if (mId) {
        await db`INSERT INTO template_methodologies (template_id, methodology_id) VALUES (${row.id as number}, ${mId}) ON CONFLICT DO NOTHING`;
      }
    }

    console.log(`  ✓ ${t.title}`);
  }

  // ---- Brand Packages ----
  const brands = readBackup("clientBrandPackage");
  console.log(`\nMigrating ${brands.length} brand packages...`);

  for (const b of brands) {
    const slug = b.slug && typeof b.slug === "object" ? (b.slug as { current: string }).current : slugify(b.clientName as string);

    await db`
      INSERT INTO brand_packages (
        sanity_id, client_name, slug, abbreviations, logos, logo_usage_rules,
        extracted_date, source_document, extracted_by, gaps, raw_markdown,
        identity, color_palette, color_usage_rules, typography, web_fonts,
        template_overrides, voice_and_tone, brand_architecture, visual_direction, key_messaging
      ) VALUES (
        ${b._id as string},
        ${b.clientName as string},
        ${slug},
        ${(b.abbreviations as string) ?? null},
        ${JSON.stringify(b.logos ?? [])},
        ${(b.logoUsageRules as string) ?? ""},
        ${(b.extractedDate as string) ?? null},
        ${(b.sourceDocument as string) ?? null},
        ${(b.extractedBy as string) ?? null},
        ${(b.gaps as string) ?? ""},
        ${(b.rawMarkdown as string) ?? ""},
        ${JSON.stringify(b.identity ?? {})},
        ${JSON.stringify(b.colorPalette ?? [])},
        ${(b.colorUsageRules as string) ?? ""},
        ${JSON.stringify(b.typography ?? {})},
        ${JSON.stringify(b.webFonts ?? [])},
        ${(b.templateOverrides as string) ?? ""},
        ${JSON.stringify(b.voiceAndTone ?? {})},
        ${JSON.stringify(b.brandArchitecture ?? {})},
        ${JSON.stringify(b.visualDirection ?? {})},
        ${JSON.stringify(b.keyMessaging ?? {})}
      )
      ON CONFLICT (slug) DO UPDATE SET
        sanity_id = EXCLUDED.sanity_id,
        updated_at = NOW()
    `;
    console.log(`  ✓ ${b.clientName}`);
  }

  // ---- Deliverable Classifications ----
  const deliverables = readBackup("deliverableClassification");
  console.log(`\nMigrating ${deliverables.length} deliverable classifications...`);

  for (const d of deliverables) {
    const slug = d.slug && typeof d.slug === "object" ? (d.slug as { current: string }).current : slugify(d.name as string);
    const practiceRef = d.practiceArea as { _ref?: string } | null;
    const practiceId = practiceRef?._ref ? practiceIdMap.get(practiceRef._ref) ?? null : null;

    await db`
      INSERT INTO deliverable_classifications (
        sanity_id, name, slug, practice_id, ai_classification, description
      ) VALUES (
        ${d._id as string},
        ${d.name as string},
        ${slug},
        ${practiceId},
        ${(d.aiClassification as string) ?? null},
        ${(d.description as string) ?? ""}
      )
      ON CONFLICT (slug) DO UPDATE SET sanity_id = EXCLUDED.sanity_id, updated_at = NOW()
    `;
    console.log(`  ✓ ${d.name}`);
  }

  // ---- Capability Records ----
  const capabilities = readBackup("capabilityRecord");
  console.log(`\nMigrating ${capabilities.length} capability records...`);

  // Build a name->id map for practice areas (capability records use string names, not references)
  const practiceNameMap = new Map<string, number>();
  const allPractices = await db`SELECT id, name FROM practices`;
  for (const p of allPractices) {
    practiceNameMap.set(p.name as string, p.id as number);
  }

  for (const c of capabilities) {
    const slug = c.slug && typeof c.slug === "object" ? (c.slug as { current: string }).current : slugify(c.deliverableName as string);
    const practiceId = c.practiceArea ? practiceNameMap.get(c.practiceArea as string) ?? null : null;
    const methRef = c.linkedMethodology as { _ref?: string } | null;
    const methodologyId = methRef?._ref ? methodologyIdMap.get(methRef._ref) ?? null : null;

    await db`
      INSERT INTO capability_records (
        sanity_id, deliverable_name, slug, practice_id, status, ai_classification,
        linked_methodology_id, current_ai_ceiling, ai_support_role,
        recommended_tool_stack, ceiling_last_reviewed, live_search_enabled,
        baseline_production_time, ai_native_production_time,
        proven_status_achieved_at, source, notes
      ) VALUES (
        ${c._id as string},
        ${c.deliverableName as string},
        ${slug},
        ${practiceId},
        ${(c.status as string) ?? "not_evaluated"},
        ${(c.aiClassification as string) ?? null},
        ${methodologyId},
        ${(c.currentAiCeiling as string) ?? ""},
        ${(c.aiSupportRole as string) ?? ""},
        ${(c.recommendedToolStack as string[]) ?? []},
        ${(c.ceilingLastReviewed as string) ?? null},
        ${(c.liveSearchEnabled as boolean) ?? false},
        ${(c.baselineProductionTime as string) ?? null},
        ${(c.aiNativeProductionTime as string) ?? null},
        ${(c.provenStatusAchievedAt as string) ?? null},
        ${(c.source as string) ?? null},
        ${(c.notes as string) ?? ""}
      )
      ON CONFLICT (slug) DO UPDATE SET sanity_id = EXCLUDED.sanity_id, updated_at = NOW()
    `;
    console.log(`  ✓ ${c.deliverableName}`);
  }

  // ---- Platform Guide (singleton) ----
  const guides = readBackup("platformGuide");
  console.log(`\nMigrating ${guides.length} platform guide...`);

  if (guides.length > 0) {
    const g = guides[0];
    await db`
      INSERT INTO platform_guide (id, platform_intro, canonical_entry_prompts, feedback_prompt, example_prompts)
      VALUES (
        1,
        ${(g.platformIntro as string) ?? ""},
        ${JSON.stringify(g.canonicalEntryPrompts ?? [])},
        ${(g.feedbackPrompt as string) ?? ""},
        ${JSON.stringify(g.examplePrompts ?? [])}
      )
      ON CONFLICT (id) DO UPDATE SET
        platform_intro = EXCLUDED.platform_intro,
        canonical_entry_prompts = EXCLUDED.canonical_entry_prompts,
        feedback_prompt = EXCLUDED.feedback_prompt,
        example_prompts = EXCLUDED.example_prompts,
        updated_at = NOW()
    `;
    console.log(`  ✓ Platform Guide`);
  }

  // ---- Verification ----
  console.log("\n=== Migration Summary ===");
  const counts = await Promise.all([
    db`SELECT count(*) as n FROM practices WHERE sanity_id IS NOT NULL`,
    db`SELECT count(*) as n FROM methodologies`,
    db`SELECT count(*) as n FROM templates`,
    db`SELECT count(*) as n FROM brand_packages`,
    db`SELECT count(*) as n FROM deliverable_classifications`,
    db`SELECT count(*) as n FROM capability_records`,
    db`SELECT count(*) as n FROM platform_guide`,
  ]);

  const labels = ["Practice areas", "Methodologies", "Templates", "Brand packages", "Deliverable classifications", "Capability records", "Platform guide"];
  const expected = [practiceAreas.length, methodologies.length, templates.length, brands.length, deliverables.length, capabilities.length, guides.length];

  for (let i = 0; i < labels.length; i++) {
    const actual = Number(counts[i][0].n);
    const match = actual >= expected[i] ? "✓" : "✗ MISMATCH";
    console.log(`  ${labels[i]}: ${actual} in Postgres (expected ${expected[i]}) ${match}`);
  }

  console.log("\nMigration complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
