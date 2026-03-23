import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserByObjectId } from "@/lib/schema";
import { NextResponse } from "next/server";

const VALID_TIERS = ["practitioner", "practice_leader", "admin"] as const;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await getUserByObjectId(session.user.id);
  if (!user || user.tier !== "admin") return null;
  return user;
}

// PATCH /api/users/[id] — update tier and/or practice (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const { tier, practice } = body as { tier?: string; practice?: string };

  if (tier !== undefined && !VALID_TIERS.includes(tier as typeof VALID_TIERS[number])) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const [updated] = await db`
    UPDATE users SET
      tier         = COALESCE(${tier ?? null}, tier),
      practice     = COALESCE(${practice ?? null}, practice)
    WHERE id = ${userId}
    RETURNING id, email, name, tier, practice
  `;

  if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user: updated });
}
