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

// GET /api/users — list all users with their roles and user-level permission overrides (admin only)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await db`
    SELECT id, object_id, email, name, account_type, practice, portal_access, mcp_access, created_at, last_seen_at
    FROM users
    ORDER BY last_seen_at DESC NULLS LAST
  `;

  const userIds = users.map((u: Record<string, unknown>) => u.id as number);

  const [userRoles, userPermissions] = await Promise.all([
    userIds.length > 0
      ? db`
          SELECT ur.user_id, r.id AS role_id, r.slug, r.display_name, r.is_system
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = ANY(${userIds})
          ORDER BY r.display_name
        `
      : [],
    userIds.length > 0
      ? db`
          SELECT up.user_id, up.id, up.action, up.type, up.scope, up.created_at,
                 g.name AS granted_by_name
          FROM user_permissions up
          LEFT JOIN users g ON g.id = up.granted_by
          WHERE up.user_id = ANY(${userIds})
          ORDER BY up.action
        `
      : [],
  ]);

  const rolesByUser: Record<number, { id: string; slug: string; display_name: string; is_system: boolean }[]> = {};
  for (const row of userRoles) {
    if (!rolesByUser[row.user_id]) rolesByUser[row.user_id] = [];
    rolesByUser[row.user_id].push({ id: row.role_id, slug: row.slug, display_name: row.display_name, is_system: row.is_system });
  }

  const permsByUser: Record<number, { id: string; action: string; type: string; scope: string; created_at: string; granted_by_name: string | null }[]> = {};
  for (const row of userPermissions) {
    if (!permsByUser[row.user_id]) permsByUser[row.user_id] = [];
    permsByUser[row.user_id].push({ id: row.id, action: row.action, type: row.type, scope: row.scope, created_at: row.created_at, granted_by_name: row.granted_by_name });
  }

  const enriched = users.map((u: Record<string, unknown>) => ({
    ...u,
    roles: rolesByUser[u.id as number] ?? [],
    user_permissions: permsByUser[u.id as number] ?? [],
  }));

  // All available roles for the assignment UI
  const allRoles = await db`SELECT id, slug, display_name, description, is_system FROM roles ORDER BY display_name`;

  // All known permission actions (union of all role_permissions + user_permissions)
  const allActions = await db`
    SELECT DISTINCT action FROM role_permissions
    UNION
    SELECT DISTINCT action FROM user_permissions
    ORDER BY action
  `;

  return NextResponse.json({ users: enriched, allRoles, allActions: allActions.map((r: Record<string, unknown>) => r.action) });
}
