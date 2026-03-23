import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserByObjectId } from "@/lib/schema";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await getUserByObjectId(session.user.id);
  if (!user || user.tier !== "admin") return null;
  return user;
}

// GET /api/users — list all users (admin only)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await db`
    SELECT id, object_id, email, name, tier, practice, created_at, last_seen_at
    FROM users
    ORDER BY last_seen_at DESC NULLS LAST
  `;

  return NextResponse.json({ users });
}
