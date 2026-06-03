import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserByObjectId } from "@/lib/schema";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await getUserByObjectId(session.user.id);
  if (!user || !["owner", "admin"].includes(user.account_type as string)) return null;
  return user;
}

// PATCH /api/practices/[id] — update a practice (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const practiceId = parseInt(id, 10);
  if (isNaN(practiceId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const { name, description } = body as { name?: string; description?: string };

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }

  try {
    const [updated] = await db`
      UPDATE practices SET
        name        = COALESCE(${name?.trim() ?? null}, name),
        description = COALESCE(${description?.trim() ?? null}, description)
      WHERE id = ${practiceId}
      RETURNING id, name, slug, description, created_at
    `;
    if (!updated) return NextResponse.json({ error: "Practice not found" }, { status: 404 });
    return NextResponse.json({ practice: updated });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "A practice with that name already exists" }, { status: 409 });
    }
    throw err;
  }
}

// DELETE /api/practices/[id] — delete a practice (admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const practiceId = parseInt(id, 10);
  if (isNaN(practiceId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [memberCount] = await db`
    SELECT COUNT(*)::int AS count FROM user_practices WHERE practice_id = ${practiceId}
  `;

  if (memberCount && (memberCount.count as number) > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${memberCount.count} user(s) are assigned to this practice. Remove them first.` },
      { status: 409 }
    );
  }

  const result = await db`DELETE FROM practices WHERE id = ${practiceId}`;
  if (result.count === 0) return NextResponse.json({ error: "Practice not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
