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

// GET /api/users — list all users with their assigned roles (admin only)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await db`
    SELECT id, object_id, email, name, tier, practice, portal_access, mcp_access, created_at, last_seen_at
    FROM users
    ORDER BY last_seen_at DESC NULLS LAST
  `;

  // Fetch roles for all users in one query
  const userIds = users.map((u: Record<string, unknown>) => u.id as number);
  const userRoles = userIds.length > 0
    ? await db`
        SELECT ur.user_id, r.id AS role_id, r.slug, r.display_name, r.is_system
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = ANY(${userIds})
        ORDER BY r.display_name
      `
    : [];

  const rolesByUser: Record<number, { id: string; slug: string; display_name: string; is_system: boolean }[]> = {};
  for (const row of userRoles) {
    if (!rolesByUser[row.user_id]) rolesByUser[row.user_id] = [];
    rolesByUser[row.user_id].push({ id: row.role_id, slug: row.slug, display_name: row.display_name, is_system: row.is_system });
  }

  const enriched = users.map((u: Record<string, unknown>) => ({
    ...u,
    roles: rolesByUser[u.id as number] ?? [],
  }));

  // Also return all available roles for the assignment UI
  const allRoles = await db`SELECT id, slug, display_name, description, is_system FROM roles ORDER BY display_name`;

  return NextResponse.json({ users: enriched, allRoles });
}
