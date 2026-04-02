import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserByObjectId } from "@/lib/schema";
import { NextResponse } from "next/server";

// GET /api/me/debug
// Returns the active debug role (if any) on the current user's most-recently-used MCP OAuth session.
// Only meaningful for owners. Used by the portal debug banner.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByObjectId(session.user.id);
  if (!user || user.account_type !== "owner") {
    return NextResponse.json({ debug_role: null });
  }

  const [row] = await db`
    SELECT s.debug_role_id, r.display_name AS role_name, r.slug AS role_slug
    FROM oauth_sessions s
    LEFT JOIN roles r ON r.id = s.debug_role_id
    WHERE s.user_id = ${user.id as number}
      AND s.expires_at > NOW()
      AND s.debug_role_id IS NOT NULL
    ORDER BY s.last_used_at DESC NULLS LAST
    LIMIT 1
  `;

  if (!row) return NextResponse.json({ debug_role: null });

  return NextResponse.json({
    debug_role: {
      id: row.debug_role_id,
      name: row.role_name,
      slug: row.role_slug,
    },
  });
}

// POST /api/me/debug — activate debug mode with a specific role on all active sessions
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByObjectId(session.user.id);
  if (!user || user.account_type !== "owner") {
    return NextResponse.json({ error: "Forbidden — only owners can use debug mode" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { role_id } = body as { role_id?: string };
  if (!role_id) return NextResponse.json({ error: "role_id is required" }, { status: 400 });

  const [role] = await db`SELECT id, display_name FROM roles WHERE id = ${role_id}`;
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  await db`
    UPDATE oauth_sessions SET debug_role_id = ${role_id}
    WHERE user_id = ${user.id as number} AND expires_at > NOW()
  `;

  return NextResponse.json({ debug_role: { id: role.id, name: role.display_name, slug: null } });
}

// DELETE /api/me/debug — clear debug mode on all active sessions for this user
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByObjectId(session.user.id);
  if (!user || user.account_type !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db`
    UPDATE oauth_sessions SET debug_role_id = NULL
    WHERE user_id = ${user.id as number} AND expires_at > NOW()
  `;

  return NextResponse.json({ cleared: true });
}
