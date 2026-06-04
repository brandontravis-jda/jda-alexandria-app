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
  const capabilityId = parseInt(id, 10);
  if (isNaN(capabilityId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [capability] = await db`
    SELECT cr.*, p.name AS practice_name, m.name AS methodology_name
    FROM capability_records cr
    LEFT JOIN practices p ON p.id = cr.practice_id
    LEFT JOIN methodologies m ON m.id = cr.linked_methodology_id
    WHERE cr.id = ${capabilityId}
  `;

  if (!capability) return NextResponse.json({ error: "Capability record not found" }, { status: 404 });
  return NextResponse.json({ capability });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const capabilityId = parseInt(id, 10);
  if (isNaN(capabilityId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const fields = body as Record<string, unknown>;

  const allowedFields = [
    "deliverable_name", "slug", "practice_id", "status",
    "ai_classification", "linked_methodology_id", "current_ai_ceiling",
    "ai_support_role", "recommended_tool_stack", "ceiling_last_reviewed",
    "live_search_enabled", "baseline_production_time",
    "ai_native_production_time", "proven_status_achieved_at",
    "source", "notes",
  ];

  const updateFields: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (fields[key] !== undefined) updateFields[key] = fields[key];
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [exists] = await db`SELECT id FROM capability_records WHERE id = ${capabilityId}`;
  if (!exists) return NextResponse.json({ error: "Capability record not found" }, { status: 404 });

  const [updated] = await db`
    UPDATE capability_records SET
      ${db(updateFields, ...Object.keys(updateFields))},
      updated_at = NOW()
    WHERE id = ${capabilityId}
    RETURNING *
  `;

  writeAuditLog({
    actorId: editor.id as number,
    action: "capability.update",
    targetType: "capability",
    targetId: capabilityId,
    details: fields,
  });

  return NextResponse.json({ capability: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const capabilityId = parseInt(id, 10);
  if (isNaN(capabilityId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const result = await db`DELETE FROM capability_records WHERE id = ${capabilityId}`;
  if (result.count === 0) return NextResponse.json({ error: "Capability record not found" }, { status: 404 });

  writeAuditLog({
    actorId: editor.id as number,
    action: "capability.delete",
    targetType: "capability",
    targetId: capabilityId,
  });

  return NextResponse.json({ ok: true });
}
