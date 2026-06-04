import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserByObjectId, writeAuditLog } from "@/lib/schema";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await getUserByObjectId(session.user.id);
  if (!user || !["owner", "admin"].includes(user.account_type as string)) return null;
  return user;
}

// GET /api/users/[id]/sessions — list active MCP sessions for a user
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const sessions = await db`
    SELECT id, created_at, expires_at, last_used_at
    FROM oauth_sessions
    WHERE user_id = ${userId} AND expires_at > NOW()
    ORDER BY last_used_at DESC NULLS LAST
  `;

  return NextResponse.json({ sessions });
}

// DELETE /api/users/[id]/sessions — revoke all MCP sessions for a user
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const result = await db`
    DELETE FROM oauth_sessions WHERE user_id = ${userId}
  `;

  writeAuditLog({
    actorId: admin.id as number,
    action: "user.sessions.revoke",
    targetType: "user",
    targetId: userId,
    details: { sessions_revoked: result.count },
  });

  return NextResponse.json({ ok: true, revoked: result.count });
}
