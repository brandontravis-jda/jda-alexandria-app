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
  const [row] = await db`
    SELECT d.*, p.name as practice_name
    FROM deliverable_classifications d
    LEFT JOIN practices p ON p.id = d.practice_id
    WHERE d.id = ${parseInt(id, 10)}
  `;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await apiRequireTier("editor");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numId = parseInt(id, 10);
  const body = await request.json();

  const [row] = await db`
    UPDATE deliverable_classifications SET
      name = COALESCE(${body.name ?? null}, name),
      slug = COALESCE(${body.slug ?? null}, slug),
      practice_id = COALESCE(${body.practice_id ?? null}, practice_id),
      ai_classification = COALESCE(${body.ai_classification ?? null}, ai_classification),
      description = COALESCE(${body.description ?? null}, description),
      status = COALESCE(${body.status ?? null}, status),
      updated_at = NOW()
    WHERE id = ${numId}
    RETURNING *
  `;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  writeAuditLog({ actorId: user.id as number, action: "deliverable.update", targetType: "deliverable", targetId: numId, details: body });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await apiRequireTier("editor");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numId = parseInt(id, 10);
  const [row] = await db`DELETE FROM deliverable_classifications WHERE id = ${numId} RETURNING id`;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  writeAuditLog({ actorId: user.id as number, action: "deliverable.delete", targetType: "deliverable", targetId: numId });
  return NextResponse.json({ ok: true });
}
