import { apiRequireTier } from "@/lib/portal-auth";
import { db, jsonb } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * One-time data repair: un-double-encode JSONB fields that were stored as
 * JSON strings instead of native JSON arrays/objects due to redundant
 * JSON.stringify() calls in the write paths.
 *
 * DELETE THIS ENDPOINT after running it once successfully.
 */
export async function POST() {
  const user = await apiRequireTier("admin");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results: Record<string, number> = {};

  // Methodologies — JSONB fields: required_inputs, steps, quality_checks,
  // failure_modes, client_refinements, quality_checklist
  const methodologyJsonbFields = [
    "required_inputs", "steps", "quality_checks",
    "failure_modes", "client_refinements", "quality_checklist",
  ];
  let methodologyFixes = 0;
  const methodologies = await db`SELECT id, required_inputs, steps, quality_checks, failure_modes, client_refinements, quality_checklist FROM methodologies`;
  for (const row of methodologies) {
    const updates: Record<string, unknown> = {};
    for (const field of methodologyJsonbFields) {
      const val = row[field];
      if (typeof val === "string") {
        try {
          updates[field] = jsonb(JSON.parse(val));
        } catch {
          // not valid JSON string — leave it alone
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      await db`UPDATE methodologies SET ${db(updates, ...Object.keys(updates))}, updated_at = NOW() WHERE id = ${row.id}`;
      methodologyFixes++;
    }
  }
  results.methodologies = methodologyFixes;

  // Brand packages — JSONB fields: logos, identity, color_palette, typography,
  // web_fonts, voice_and_tone, brand_architecture, visual_direction, key_messaging
  const brandJsonbFields = [
    "logos", "identity", "color_palette", "typography", "web_fonts",
    "voice_and_tone", "brand_architecture", "visual_direction", "key_messaging",
  ];
  let brandFixes = 0;
  const brands = await db`SELECT id, logos, identity, color_palette, typography, web_fonts, voice_and_tone, brand_architecture, visual_direction, key_messaging FROM brand_packages`;
  for (const row of brands) {
    const updates: Record<string, unknown> = {};
    for (const field of brandJsonbFields) {
      const val = row[field];
      if (typeof val === "string") {
        try {
          updates[field] = jsonb(JSON.parse(val));
        } catch {
          // not valid JSON string — leave it alone
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      await db`UPDATE brand_packages SET ${db(updates, ...Object.keys(updates))}, updated_at = NOW() WHERE id = ${row.id}`;
      brandFixes++;
    }
  }
  results.brand_packages = brandFixes;

  // Platform guide — JSONB fields: canonical_entry_prompts, example_prompts
  const guideJsonbFields = ["canonical_entry_prompts", "example_prompts"];
  let guideFixes = 0;
  const guides = await db`SELECT id, canonical_entry_prompts, example_prompts FROM platform_guide`;
  for (const row of guides) {
    const updates: Record<string, unknown> = {};
    for (const field of guideJsonbFields) {
      const val = row[field];
      if (typeof val === "string") {
        try {
          updates[field] = jsonb(JSON.parse(val));
        } catch {
          // not valid JSON string — leave it alone
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      await db`UPDATE platform_guide SET ${db(updates, ...Object.keys(updates))}, updated_at = NOW() WHERE id = ${row.id}`;
      guideFixes++;
    }
  }
  results.platform_guide = guideFixes;

  // Intake sessions — JSONB field: answers
  let intakeFixes = 0;
  const intakes = await db`SELECT session_id, answers FROM intake_sessions WHERE answers IS NOT NULL`;
  for (const row of intakes) {
    if (typeof row.answers === "string") {
      try {
        const parsed = JSON.parse(row.answers as string);
        await db`UPDATE intake_sessions SET answers = ${jsonb(parsed)} WHERE session_id = ${row.session_id}`;
        intakeFixes++;
      } catch {
        // leave it alone
      }
    }
  }
  results.intake_sessions = intakeFixes;

  return NextResponse.json({
    message: "JSONB double-encoding repair complete",
    rows_fixed: results,
  });
}
