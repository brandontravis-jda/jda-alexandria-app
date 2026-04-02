import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserByObjectId } from "@/lib/schema";
import { NextResponse } from "next/server";

// POST /api/users/[id]/transfer-ownership
// Owner-only. Atomically transfers owner status to another existing user.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentOwner = await getUserByObjectId(session.user.id);
  if (!currentOwner || currentOwner.account_type !== "owner") {
    return NextResponse.json({ error: "Only the current Owner may transfer ownership" }, { status: 403 });
  }

  const { id } = await params;
  const targetId = parseInt(id, 10);
  if (isNaN(targetId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  if (targetId === currentOwner.id) {
    return NextResponse.json({ error: "Cannot transfer ownership to yourself" }, { status: 400 });
  }

  const [target] = await db`SELECT id, name, email, account_type FROM users WHERE id = ${targetId}`;
  if (!target) return NextResponse.json({ error: "Target user not found" }, { status: 404 });

  // Atomic swap — exactly one owner at all times
  await db`
    UPDATE users SET account_type = 'admin' WHERE id = ${currentOwner.id as number}
  `;
  await db`
    UPDATE users SET account_type = 'owner' WHERE id = ${targetId}
  `;

  return NextResponse.json({
    transferred: true,
    new_owner: { id: target.id, name: target.name, email: target.email },
  });
}
