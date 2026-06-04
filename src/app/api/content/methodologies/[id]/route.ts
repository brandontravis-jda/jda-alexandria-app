import { apiRequireTier } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/schema";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await apiRequireTier("viewer");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const methodologyId = parseInt(id, 10);
  if (isNaN(methodologyId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [methodology] = await db`
    SELECT m.*, p.name AS practice_name
    FROM methodologies m
    LEFT JOIN practices p ON p.id = m.practice_id
    WHERE m.id = ${methodologyId}
  `;

  if (!methodology) return NextResponse.json({ error: "Methodology not found" }, { status: 404 });
  return NextResponse.json({ methodology });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const methodologyId = parseInt(id, 10);
  if (isNaN(methodologyId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const fields = body as Record<string, unknown>;

  const allowedFields = [
    "name", "slug", "description", "practice_id", "ai_classification",
    "tools_involved", "required_inputs", "system_instructions", "steps",
    "output_format", "quality_checks", "failure_modes", "vision_of_good",
    "tips", "client_refinements", "quality_checklist",
    "baseline_production_time", "ai_native_production_time",
    "proven_status", "proven_date", "version", "author", "validated_by",
    "include_feedback_prompt", "status",
  ];

  const jsonFields = new Set([
    "required_inputs", "steps", "quality_checks", "failure_modes",
    "client_refinements", "quality_checklist",
  ]);

  const updateFields: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      updateFields[key] = jsonFields.has(key)
        ? JSON.stringify(fields[key])
        : fields[key];
    }
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [exists] = await db`SELECT id FROM methodologies WHERE id = ${methodologyId}`;
  if (!exists) return NextResponse.json({ error: "Methodology not found" }, { status: 404 });

  const [updated] = await db`
    UPDATE methodologies SET
      ${db(updateFields, ...Object.keys(updateFields))},
      updated_at = NOW()
    WHERE id = ${methodologyId}
    RETURNING *
  `;

  writeAuditLog({
    actorId: editor.id as number,
    action: "methodology.update",
    targetType: "methodology",
    targetId: methodologyId,
    details: fields,
  });

  return NextResponse.json({ methodology: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const methodologyId = parseInt(id, 10);
  if (isNaN(methodologyId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const result = await db`DELETE FROM methodologies WHERE id = ${methodologyId}`;
  if (result.count === 0) return NextResponse.json({ error: "Methodology not found" }, { status: 404 });

  writeAuditLog({
    actorId: editor.id as number,
    action: "methodology.delete",
    targetType: "methodology",
    targetId: methodologyId,
  });

  return NextResponse.json({ ok: true });
}
