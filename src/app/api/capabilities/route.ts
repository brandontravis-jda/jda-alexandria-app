import { apiRequireTier } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const user = await apiRequireTier("viewer");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const practiceArea = searchParams.get("practice_area");
  const classification = searchParams.get("classification");
  const status = searchParams.get("status");

  const records = await db`
    SELECT
      cr.id,
      cr.deliverable_name,
      cr.slug,
      p.name AS practice_area,
      cr.status,
      cr.ai_classification,
      cr.baseline_production_time,
      cr.ai_native_production_time,
      CASE WHEN m.id IS NOT NULL
        THEN json_build_object('name', m.name, 'slug', m.slug)
        ELSE NULL
      END AS linked_methodology,
      cr.source,
      cr.notes
    FROM capability_records cr
    LEFT JOIN practices p ON p.id = cr.practice_id
    LEFT JOIN methodologies m ON m.id = cr.linked_methodology_id
    WHERE
      (${practiceArea}::text IS NULL OR p.name = ${practiceArea})
      AND (${classification}::text IS NULL OR cr.ai_classification = ${classification})
      AND (${status}::text IS NULL OR cr.status = ${status})
    ORDER BY p.name ASC NULLS LAST, cr.deliverable_name ASC
  `;

  const stats = {
    total: records.length,
    not_evaluated: records.filter((r) => r.status === "not_evaluated").length,
    classified: records.filter((r) => r.status === "classified").length,
    methodology_built: records.filter((r) => r.status === "methodology_built").length,
    proven_status: records.filter((r) => r.status === "proven_status").length,
    ai_led: records.filter((r) => r.ai_classification === "ai_led").length,
    ai_assisted: records.filter((r) => r.ai_classification === "ai_assisted").length,
    human_led: records.filter((r) => r.ai_classification === "human_led").length,
  };

  return NextResponse.json({ records, stats });
}
