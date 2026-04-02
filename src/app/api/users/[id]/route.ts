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

// PATCH /api/users/[id] — update practice, portal_access, role assignment, or user-level permission overrides
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Owner guard: never allow modifications to the owner account via this route
  const [target] = await db`SELECT id, account_type FROM users WHERE id = ${userId}`;
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.account_type === "owner") {
    return NextResponse.json({ error: "Owner account cannot be modified via this route" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    practice,
    portal_access,
    mcp_access,
    account_type,
    add_role,
    remove_role,
    add_permission,
    remove_permission_action,
  } = body as {
    practice?: string;
    portal_access?: boolean;
    mcp_access?: boolean;
    account_type?: "owner" | "admin" | "user";
    add_role?: string;
    remove_role?: string;
    add_permission?: { action: string; type: "grant" | "deny"; scope?: string };
    remove_permission_action?: string;
  };

  // Validate account_type changes — cannot assign or remove owner via this route
  if (account_type !== undefined && account_type === "owner") {
    return NextResponse.json({ error: "Use the transfer-ownership route to assign owner" }, { status: 400 });
  }

  // Build SET clause for user fields
  const updates: Record<string, unknown> = {};
  if (practice !== undefined) updates.practice = practice ?? null;
  if (portal_access !== undefined) updates.portal_access = portal_access;
  if (mcp_access !== undefined) updates.mcp_access = mcp_access;
  if (account_type !== undefined) updates.account_type = account_type;

  let updated: Record<string, unknown> | null = null;

  if (Object.keys(updates).length > 0) {
    const [row] = await db`
      UPDATE users SET
        practice      = COALESCE(${updates.practice as string ?? null}, practice),
        portal_access = COALESCE(${updates.portal_access as boolean ?? null}, portal_access),
        mcp_access    = COALESCE(${updates.mcp_access as boolean ?? null}, mcp_access),
        account_type  = COALESCE(${updates.account_type as string ?? null}, account_type)
      WHERE id = ${userId}
      RETURNING id, email, name, account_type, practice, portal_access, mcp_access
    `;
    updated = row ?? null;
  } else {
    const [row] = await db`SELECT id, email, name, account_type, practice, portal_access, mcp_access FROM users WHERE id = ${userId}`;
    updated = row ?? null;
  }

  if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Role assignment
  if (add_role) {
    await db`
      INSERT INTO user_roles (user_id, role_id, granted_by)
      VALUES (${userId}, ${add_role}, ${admin.id as number})
      ON CONFLICT (user_id, role_id) DO NOTHING
    `;
  }
  if (remove_role) {
    await db`DELETE FROM user_roles WHERE user_id = ${userId} AND role_id = ${remove_role}`;
  }

  // User-level permission overrides
  if (add_permission) {
    const validTypes = ["grant", "deny"];
    const validScopes = ["own_practice", "all", "none"];
    if (!add_permission.action?.trim()) return NextResponse.json({ error: "action is required" }, { status: 400 });
    if (!validTypes.includes(add_permission.type)) return NextResponse.json({ error: "type must be grant or deny" }, { status: 400 });
    const scope = add_permission.scope ?? "all";
    if (!validScopes.includes(scope)) return NextResponse.json({ error: "Invalid scope" }, { status: 400 });

    await db`
      INSERT INTO user_permissions (user_id, action, type, scope, granted_by)
      VALUES (${userId}, ${add_permission.action.trim()}, ${add_permission.type}, ${scope}, ${admin.id as number})
      ON CONFLICT (user_id, action) DO UPDATE SET
        type       = EXCLUDED.type,
        scope      = EXCLUDED.scope,
        granted_by = EXCLUDED.granted_by,
        created_at = NOW()
    `;
  }
  if (remove_permission_action) {
    await db`DELETE FROM user_permissions WHERE user_id = ${userId} AND action = ${remove_permission_action}`;
  }

  // Return updated roles and permissions
  const [roles, userPermissions] = await Promise.all([
    db`
      SELECT r.id, r.slug, r.display_name, r.is_system
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ${userId}
      ORDER BY r.display_name
    `,
    db`
      SELECT id, action, type, scope, created_at
      FROM user_permissions
      WHERE user_id = ${userId}
      ORDER BY action
    `,
  ]);

  return NextResponse.json({ user: { ...updated, roles, user_permissions: userPermissions } });
}
