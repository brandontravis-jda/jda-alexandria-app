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
  const packageId = parseInt(id, 10);
  if (isNaN(packageId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [brandPackage] = await db`
    SELECT * FROM brand_packages WHERE id = ${packageId}
  `;

  if (!brandPackage) return NextResponse.json({ error: "Brand package not found" }, { status: 404 });
  return NextResponse.json({ brand_package: brandPackage });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const packageId = parseInt(id, 10);
  if (isNaN(packageId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const fields = body as Record<string, unknown>;

  const allowedFields = [
    "client_name", "slug", "abbreviations", "logos", "logo_usage_rules",
    "extracted_date", "source_document", "extracted_by", "gaps",
    "raw_markdown", "identity", "color_palette", "color_usage_rules",
    "typography", "web_fonts", "template_overrides", "voice_and_tone",
    "brand_architecture", "visual_direction", "key_messaging", "status",
  ];

  const jsonFields = new Set([
    "logos", "identity", "color_palette", "typography", "web_fonts",
    "voice_and_tone", "brand_architecture", "visual_direction", "key_messaging",
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

  const [exists] = await db`SELECT id FROM brand_packages WHERE id = ${packageId}`;
  if (!exists) return NextResponse.json({ error: "Brand package not found" }, { status: 404 });

  const [updated] = await db`
    UPDATE brand_packages SET
      ${db(updateFields, ...Object.keys(updateFields))},
      updated_at = NOW()
    WHERE id = ${packageId}
    RETURNING *
  `;

  writeAuditLog({
    actorId: editor.id as number,
    action: "brand_package.update",
    targetType: "brand_package",
    targetId: packageId,
    details: fields,
  });

  return NextResponse.json({ brand_package: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const packageId = parseInt(id, 10);
  if (isNaN(packageId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const result = await db`DELETE FROM brand_packages WHERE id = ${packageId}`;
  if (result.count === 0) return NextResponse.json({ error: "Brand package not found" }, { status: 404 });

  writeAuditLog({
    actorId: editor.id as number,
    action: "brand_package.delete",
    targetType: "brand_package",
    targetId: packageId,
  });

  return NextResponse.json({ ok: true });
}
