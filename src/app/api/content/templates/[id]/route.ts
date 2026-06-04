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
  const templateId = parseInt(id, 10);
  if (isNaN(templateId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [template] = await db`
    SELECT t.*,
      COALESCE(
        (SELECT json_agg(json_build_object('id', p.id, 'name', p.name))
         FROM template_practices tp
         JOIN practices p ON p.id = tp.practice_id
         WHERE tp.template_id = t.id), '[]'::json
      ) AS practice_areas,
      COALESCE(
        (SELECT json_agg(json_build_object('id', m.id, 'name', m.name))
         FROM template_methodologies tm
         JOIN methodologies m ON m.id = tm.methodology_id
         WHERE tm.template_id = t.id), '[]'::json
      ) AS related_methodologies
    FROM templates t
    WHERE t.id = ${templateId}
  `;

  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ template });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const templateId = parseInt(id, 10);
  if (isNaN(templateId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const { practice_ids, methodology_ids, ...fields } = body as Record<string, unknown>;

  const allowedFields = [
    "title", "slug", "format_type", "preview_url", "github_raw_url",
    "dropbox_link", "use_cases", "feature_list", "fixed_elements",
    "variable_elements", "brand_injection_rules", "client_adaptation_notes",
    "output_spec", "quality_checks", "include_feedback_prompt", "status",
  ];

  const updateFields: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (fields[key] !== undefined) updateFields[key] = fields[key];
  }

  const hasFieldUpdates = Object.keys(updateFields).length > 0;
  const hasRelationUpdates =
    Array.isArray(practice_ids) || Array.isArray(methodology_ids);

  if (!hasFieldUpdates && !hasRelationUpdates) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [exists] = await db`SELECT id FROM templates WHERE id = ${templateId}`;
  if (!exists) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  if (hasFieldUpdates) {
    await db`
      UPDATE templates SET
        ${db(updateFields, ...Object.keys(updateFields))},
        updated_at = NOW()
      WHERE id = ${templateId}
    `;
  } else {
    await db`UPDATE templates SET updated_at = NOW() WHERE id = ${templateId}`;
  }

  if (Array.isArray(practice_ids)) {
    await db`DELETE FROM template_practices WHERE template_id = ${templateId}`;
    if (practice_ids.length > 0) {
      await db`
        INSERT INTO template_practices (template_id, practice_id)
        SELECT ${templateId}, unnest(${practice_ids as number[]}::int[])
      `;
    }
  }

  if (Array.isArray(methodology_ids)) {
    await db`DELETE FROM template_methodologies WHERE template_id = ${templateId}`;
    if (methodology_ids.length > 0) {
      await db`
        INSERT INTO template_methodologies (template_id, methodology_id)
        SELECT ${templateId}, unnest(${methodology_ids as number[]}::int[])
      `;
    }
  }

  const [updated] = await db`
    SELECT t.*,
      COALESCE(
        (SELECT json_agg(json_build_object('id', p.id, 'name', p.name))
         FROM template_practices tp
         JOIN practices p ON p.id = tp.practice_id
         WHERE tp.template_id = t.id), '[]'::json
      ) AS practice_areas,
      COALESCE(
        (SELECT json_agg(json_build_object('id', m.id, 'name', m.name))
         FROM template_methodologies tm
         JOIN methodologies m ON m.id = tm.methodology_id
         WHERE tm.template_id = t.id), '[]'::json
      ) AS related_methodologies
    FROM templates t
    WHERE t.id = ${templateId}
  `;

  writeAuditLog({
    actorId: editor.id as number,
    action: "template.update",
    targetType: "template",
    targetId: templateId,
    details: { ...updateFields, practice_ids, methodology_ids },
  });

  return NextResponse.json({ template: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const templateId = parseInt(id, 10);
  if (isNaN(templateId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const result = await db`DELETE FROM templates WHERE id = ${templateId}`;
  if (result.count === 0) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  writeAuditLog({
    actorId: editor.id as number,
    action: "template.delete",
    targetType: "template",
    targetId: templateId,
  });

  return NextResponse.json({ ok: true });
}
