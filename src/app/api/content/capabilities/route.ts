import { apiRequireTier } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/schema";
import { NextResponse } from "next/server";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(request: Request) {
  const user = await apiRequireTier("viewer");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const practiceId = searchParams.get("practice_id");

  let capabilities;
  if (practiceId) {
    const pid = parseInt(practiceId, 10);
    if (isNaN(pid)) return NextResponse.json({ error: "Invalid practice_id" }, { status: 400 });
    capabilities = await db`
      SELECT cr.*, p.name AS practice_name, m.name AS methodology_name
      FROM capability_records cr
      LEFT JOIN practices p ON p.id = cr.practice_id
      LEFT JOIN methodologies m ON m.id = cr.linked_methodology_id
      WHERE cr.practice_id = ${pid}
      ORDER BY cr.deliverable_name
    `;
  } else {
    capabilities = await db`
      SELECT cr.*, p.name AS practice_name, m.name AS methodology_name
      FROM capability_records cr
      LEFT JOIN practices p ON p.id = cr.practice_id
      LEFT JOIN methodologies m ON m.id = cr.linked_methodology_id
      ORDER BY cr.deliverable_name
    `;
  }

  return NextResponse.json({ capabilities });
}

export async function POST(request: Request) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    deliverable_name, slug: rawSlug, practice_id, status,
    ai_classification, linked_methodology_id, current_ai_ceiling,
    ai_support_role, recommended_tool_stack, ceiling_last_reviewed,
    live_search_enabled, baseline_production_time,
    ai_native_production_time, proven_status_achieved_at,
    source, notes,
  } = body as Record<string, unknown>;

  if (!deliverable_name || !(deliverable_name as string).trim()) {
    return NextResponse.json({ error: "Deliverable name is required" }, { status: 400 });
  }

  const slug = (rawSlug as string)?.trim() || slugify((deliverable_name as string).trim());
  if (!slug) {
    return NextResponse.json({ error: "Name must produce a valid slug" }, { status: 400 });
  }

  try {
    const [row] = await db`
      INSERT INTO capability_records (
        deliverable_name, slug, practice_id, status, ai_classification,
        linked_methodology_id, current_ai_ceiling, ai_support_role,
        recommended_tool_stack, ceiling_last_reviewed, live_search_enabled,
        baseline_production_time, ai_native_production_time,
        proven_status_achieved_at, source, notes
      ) VALUES (
        ${(deliverable_name as string).trim()},
        ${slug},
        ${(practice_id as number) ?? null},
        ${(status as string) ?? "not_evaluated"},
        ${(ai_classification as string) ?? null},
        ${(linked_methodology_id as number) ?? null},
        ${(current_ai_ceiling as string) ?? ""},
        ${(ai_support_role as string) ?? ""},
        ${(recommended_tool_stack as string[]) ?? []},
        ${(ceiling_last_reviewed as string) ?? null},
        ${(live_search_enabled as boolean) ?? false},
        ${(baseline_production_time as string) ?? null},
        ${(ai_native_production_time as string) ?? null},
        ${(proven_status_achieved_at as string) ?? null},
        ${(source as string) ?? null},
        ${(notes as string) ?? ""}
      )
      RETURNING *
    `;

    writeAuditLog({
      actorId: editor.id as number,
      action: "capability.create",
      targetType: "capability",
      targetId: row.id as number,
      details: { deliverable_name: (deliverable_name as string).trim(), slug },
    });

    return NextResponse.json({ capability: row }, { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "A capability record with that slug already exists" }, { status: 409 });
    }
    throw err;
  }
}
