import { auth } from "@/lib/auth";
import { getUserByObjectId } from "@/lib/schema";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/me — return the current authenticated user's DB record
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByObjectId(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    account_type: user.account_type,
    practice: user.practice,
    portal_access: user.portal_access,
  });
}
