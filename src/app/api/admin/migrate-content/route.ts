import { apiRequireTier } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/schema";

/**
 * ONE-TIME migration endpoint: populates Postgres content tables from
 * the Sanity backup data embedded below. Remove this route after migration.
 */
export async function POST() {
  const admin = await apiRequireTier("admin");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if migration has already run
  const [existing] = await db`SELECT count(*)::int as n FROM methodologies`;
  if (existing.n > 0) {
    return NextResponse.json({ error: "Content tables already have data. Migration skipped.", already_migrated: true }, { status: 409 });
  }

  try {
    const results: Record<string, number> = {};

    // We'll fetch from Sanity API directly since we still have the env vars available
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

    if (!projectId) {
      return NextResponse.json({ error: "SANITY_PROJECT_ID not available — cannot fetch content" }, { status: 500 });
    }

    async function sanityQuery(query: string) {
      const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.result;
    }

    function slugify(name: string): string {
      return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    }

    // ---- Practice Areas ----
    const practiceAreas = await sanityQuery('*[_type == "practiceArea"] | order(name asc)');
    const practiceIdMap = new Map<string, number>();

    for (const pa of practiceAreas) {
      const slug = pa.slug?.current ?? slugify(pa.name);
      const [row] = await db`
        INSERT INTO practices (name, slug, description, sanity_id, activation_status)
        VALUES (${pa.name}, ${slug}, ${pa.description ?? null}, ${pa._id}, ${pa.activationStatus ?? "not_started"})
        ON CONFLICT (slug) DO UPDATE SET sanity_id = EXCLUDED.sanity_id, activation_status = EXCLUDED.activation_status
        RETURNING id
      `;
      practiceIdMap.set(pa._id, row.id as number);
    }
    results.practice_areas = practiceAreas.length;

    // ---- Methodologies ----
    const methodologies = await sanityQuery('*[_type == "productionMethodology"] | order(name asc)');
    const methodologyIdMap = new Map<string, number>();

    for (const m of methodologies) {
      const slug = m.slug?.current ?? slugify(m.name);
      const practiceId = m.practice?._ref ? practiceIdMap.get(m.practice._ref) ?? null : null;
      const [row] = await db`
        INSERT INTO methodologies (
          sanity_id, name, slug, description, practice_id, ai_classification,
          tools_involved, required_inputs, system_instructions, steps, output_format,
          quality_checks, failure_modes, vision_of_good, tips, client_refinements,
          quality_checklist, baseline_production_time, ai_native_production_time,
          proven_status, proven_date, version, author, validated_by, include_feedback_prompt
        ) VALUES (
          ${m._id}, ${m.name}, ${slug}, ${m.description ?? ""},
          ${practiceId}, ${m.aiClassification ?? null},
          ${m.toolsInvolved ?? []}, ${JSON.stringify(m.requiredInputs ?? [])},
          ${m.systemInstructions ?? ""}, ${JSON.stringify(m.steps ?? [])},
          ${m.outputFormat ?? ""}, ${JSON.stringify(m.qualityChecks ?? [])},
          ${JSON.stringify(m.failureModes ?? [])}, ${m.visionOfGood ?? ""},
          ${m.tips ?? ""}, ${JSON.stringify(m.clientRefinements ?? [])},
          ${JSON.stringify(m.qualityChecklist ?? [])},
          ${m.baselineProductionTime ?? null}, ${m.aiNativeProductionTime ?? null},
          ${m.provenStatus ?? false}, ${m.provenDate ?? null},
          ${m.version ?? 1}, ${m.author ?? null}, ${m.validatedBy ?? null},
          ${m.includeFeedbackPrompt ?? false}
        )
        ON CONFLICT (slug) DO UPDATE SET sanity_id = EXCLUDED.sanity_id RETURNING id
      `;
      methodologyIdMap.set(m._id, row.id as number);
    }
    results.methodologies = methodologies.length;

    // ---- Templates ----
    const templates = await sanityQuery('*[_type == "template"] | order(title asc)');
    for (const t of templates) {
      const slug = t.slug?.current ?? slugify(t.title);
      const [row] = await db`
        INSERT INTO templates (
          sanity_id, title, slug, format_type, preview_url, github_raw_url, dropbox_link,
          use_cases, feature_list, fixed_elements, variable_elements, brand_injection_rules,
          client_adaptation_notes, output_spec, quality_checks, include_feedback_prompt, status
        ) VALUES (
          ${t._id}, ${t.title}, ${slug}, ${t.formatType ?? null},
          ${t.previewUrl ?? null}, ${t.githubRawUrl ?? null}, ${t.dropboxLink ?? null},
          ${t.useCases ?? ""}, ${t.featureList ?? ""}, ${t.fixedElements ?? ""},
          ${t.variableElements ?? ""}, ${t.brandInjectionRules ?? ""},
          ${t.clientAdaptationNotes ?? ""}, ${t.outputSpec ?? ""},
          ${t.qualityChecks ?? ""}, ${t.includeFeedbackPrompt ?? false},
          ${t.status ?? "draft"}
        )
        ON CONFLICT (slug) DO UPDATE SET sanity_id = EXCLUDED.sanity_id RETURNING id
      `;
      for (const ref of (t.practiceAreas ?? [])) {
        const pId = practiceIdMap.get(ref._ref);
        if (pId) await db`INSERT INTO template_practices (template_id, practice_id) VALUES (${row.id as number}, ${pId}) ON CONFLICT DO NOTHING`;
      }
      for (const ref of (t.relatedMethodologies ?? [])) {
        const mId = methodologyIdMap.get(ref._ref);
        if (mId) await db`INSERT INTO template_methodologies (template_id, methodology_id) VALUES (${row.id as number}, ${mId}) ON CONFLICT DO NOTHING`;
      }
    }
    results.templates = templates.length;

    // ---- Brand Packages ----
    const brands = await sanityQuery('*[_type == "clientBrandPackage"] | order(clientName asc)');
    for (const b of brands) {
      const slug = b.slug?.current ?? slugify(b.clientName);
      await db`
        INSERT INTO brand_packages (
          sanity_id, client_name, slug, abbreviations, logos, logo_usage_rules,
          extracted_date, source_document, extracted_by, gaps, raw_markdown,
          identity, color_palette, color_usage_rules, typography, web_fonts,
          template_overrides, voice_and_tone, brand_architecture, visual_direction, key_messaging
        ) VALUES (
          ${b._id}, ${b.clientName}, ${slug}, ${b.abbreviations ?? null},
          ${JSON.stringify(b.logos ?? [])}, ${b.logoUsageRules ?? ""},
          ${b.extractedDate ?? null}, ${b.sourceDocument ?? null}, ${b.extractedBy ?? null},
          ${b.gaps ?? ""}, ${b.rawMarkdown ?? ""},
          ${JSON.stringify(b.identity ?? {})}, ${JSON.stringify(b.colorPalette ?? [])},
          ${b.colorUsageRules ?? ""}, ${JSON.stringify(b.typography ?? {})},
          ${JSON.stringify(b.webFonts ?? [])}, ${b.templateOverrides ?? ""},
          ${JSON.stringify(b.voiceAndTone ?? {})}, ${JSON.stringify(b.brandArchitecture ?? {})},
          ${JSON.stringify(b.visualDirection ?? {})}, ${JSON.stringify(b.keyMessaging ?? {})}
        )
        ON CONFLICT (slug) DO UPDATE SET sanity_id = EXCLUDED.sanity_id
      `;
    }
    results.brand_packages = brands.length;

    // ---- Capability Records ----
    const capabilities = await sanityQuery('*[_type == "capabilityRecord"] | order(deliverableName asc)');
    const practiceNameMap = new Map<string, number>();
    const allPractices = await db`SELECT id, name FROM practices`;
    for (const p of allPractices) practiceNameMap.set(p.name as string, p.id as number);

    for (const c of capabilities) {
      const slug = c.slug?.current ?? slugify(c.deliverableName);
      const practiceId = c.practiceArea ? practiceNameMap.get(c.practiceArea) ?? null : null;
      const methId = c.linkedMethodology?._ref ? methodologyIdMap.get(c.linkedMethodology._ref) ?? null : null;
      await db`
        INSERT INTO capability_records (
          sanity_id, deliverable_name, slug, practice_id, status, ai_classification,
          linked_methodology_id, current_ai_ceiling, ai_support_role,
          recommended_tool_stack, ceiling_last_reviewed, live_search_enabled,
          baseline_production_time, ai_native_production_time,
          proven_status_achieved_at, source, notes
        ) VALUES (
          ${c._id}, ${c.deliverableName}, ${slug}, ${practiceId},
          ${c.status ?? "not_evaluated"}, ${c.aiClassification ?? null},
          ${methId}, ${c.currentAiCeiling ?? ""}, ${c.aiSupportRole ?? ""},
          ${c.recommendedToolStack ?? []}, ${c.ceilingLastReviewed ?? null},
          ${c.liveSearchEnabled ?? false}, ${c.baselineProductionTime ?? null},
          ${c.aiNativeProductionTime ?? null}, ${c.provenStatusAchievedAt ?? null},
          ${c.source ?? null}, ${c.notes ?? ""}
        )
        ON CONFLICT (slug) DO UPDATE SET sanity_id = EXCLUDED.sanity_id
      `;
    }
    results.capability_records = capabilities.length;

    // ---- Deliverable Classifications ----
    const deliverables = await sanityQuery('*[_type == "deliverableClassification"] | order(name asc)');
    for (const d of deliverables) {
      const slug = d.slug?.current ?? slugify(d.name);
      const practiceId = d.practiceArea?._ref ? practiceIdMap.get(d.practiceArea._ref) ?? null : null;
      await db`
        INSERT INTO deliverable_classifications (sanity_id, name, slug, practice_id, ai_classification, description)
        VALUES (${d._id}, ${d.name}, ${slug}, ${practiceId}, ${d.aiClassification ?? null}, ${d.description ?? ""})
        ON CONFLICT (slug) DO UPDATE SET sanity_id = EXCLUDED.sanity_id
      `;
    }
    results.deliverable_classifications = deliverables.length;

    // ---- Platform Guide ----
    const guides = await sanityQuery('*[_type == "platformGuide"]');
    if (guides.length > 0) {
      const g = guides[0];
      await db`
        INSERT INTO platform_guide (id, platform_intro, canonical_entry_prompts, feedback_prompt, example_prompts)
        VALUES (1, ${g.platformIntro ?? ""}, ${JSON.stringify(g.canonicalEntryPrompts ?? [])}, ${g.feedbackPrompt ?? ""}, ${JSON.stringify(g.examplePrompts ?? [])})
        ON CONFLICT (id) DO UPDATE SET platform_intro = EXCLUDED.platform_intro, canonical_entry_prompts = EXCLUDED.canonical_entry_prompts, feedback_prompt = EXCLUDED.feedback_prompt, example_prompts = EXCLUDED.example_prompts, updated_at = NOW()
      `;
    }
    results.platform_guide = guides.length;

    writeAuditLog({ actorId: admin.id as number, action: "content.migration", details: results });

    return NextResponse.json({ ok: true, migrated: results });
  } catch (err) {
    console.error("Content migration failed:", err);
    return NextResponse.json({ error: "Migration failed", detail: String(err) }, { status: 500 });
  }
}
