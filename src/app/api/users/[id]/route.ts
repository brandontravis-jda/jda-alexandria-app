import { apiRequireTier } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/schema";
import { NextResponse } from "next/server";

// PATCH /api/users/[id] — update practice, portal_access, role assignment, or user-level permission overrides
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await apiRequireTier("admin");
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
    practice_ids,
    add_practice,
    remove_practice,
    portal_tier,
    mcp_access,
    account_type,
    add_role,
    remove_role,
    add_permission,
    remove_permission_action,
  } = body as {
    practice?: string;
    practice_ids?: number[];
    add_practice?: number;
    remove_practice?: number;
    portal_tier?: string;
    mcp_access?: boolean;
    account_type?: "owner" | "admin" | "user";
    add_role?: string;
    remove_role?: string;
    add_permission?: { action: string; type: "grant" | "deny"; scope?: string };
    remove_permission_action?: string;
  };

  if (account_type !== undefined && account_type === "owner") {
    return NextResponse.json({ error: "Use the transfer-ownership route to assign owner" }, { status: 400 });
  }

  const validTiers = ["none", "viewer", "editor", "leadership", "admin"];
  if (portal_tier !== undefined && !validTiers.includes(portal_tier)) {
    return NextResponse.json({ error: "Invalid portal_tier" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (practice !== undefined) updates.practice = practice ?? null;
  if (mcp_access !== undefined) updates.mcp_access = mcp_access;
  if (account_type !== undefined) updates.account_type = account_type;
  if (portal_tier !== undefined) updates.portal_tier = portal_tier;

  // When promoting to admin account_type, auto-set tier to admin
  if (account_type === "admin" && !portal_tier) updates.portal_tier = "admin";

  let updated: Record<string, unknown> | null = null;

  if (Object.keys(updates).length > 0) {
    const [row] = await db`
      UPDATE users SET
        practice      = COALESCE(${updates.practice as string ?? null}, practice),
        portal_tier   = COALESCE(${updates.portal_tier as string ?? null}, portal_tier),
        mcp_access    = COALESCE(${updates.mcp_access as boolean ?? null}, mcp_access),
        account_type  = COALESCE(${updates.account_type as string ?? null}, account_type)
      WHERE id = ${userId}
      RETURNING id, email, name, account_type, practice, portal_tier, mcp_access
    `;
    updated = row ?? null;
    writeAuditLog({ actorId: admin.id as number, action: "user.update", targetType: "user", targetId: userId, details: updates });
  } else {
    const [row] = await db`SELECT id, email, name, account_type, practice, portal_tier, mcp_access FROM users WHERE id = ${userId}`;
    updated = row ?? null;
  }

  if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Practice assignment — full replace, add single, or remove single
  if (practice_ids !== undefined) {
    await db`DELETE FROM user_practices WHERE user_id = ${userId}`;
    if (practice_ids.length > 0) {
      await db`
        INSERT INTO user_practices (user_id, practice_id)
        SELECT ${userId}, unnest(${practice_ids}::int[])
        ON CONFLICT (user_id, practice_id) DO NOTHING
      `;
    }
  }
  if (add_practice !== undefined) {
    await db`
      INSERT INTO user_practices (user_id, practice_id)
      VALUES (${userId}, ${add_practice})
      ON CONFLICT (user_id, practice_id) DO NOTHING
    `;
  }
  if (remove_practice !== undefined) {
    await db`DELETE FROM user_practices WHERE user_id = ${userId} AND practice_id = ${remove_practice}`;
  }

  // Role assignment
  if (add_role) {
    await db`
      INSERT INTO user_roles (user_id, role_id, granted_by)
      VALUES (${userId}, ${add_role}, ${admin.id as number})
      ON CONFLICT (user_id, role_id) DO NOTHING
    `;
    writeAuditLog({ actorId: admin.id as number, action: "user.role.add", targetType: "user", targetId: userId, details: { role_id: add_role } });
  }
  if (remove_role) {
    await db`DELETE FROM user_roles WHERE user_id = ${userId} AND role_id = ${remove_role}`;
    writeAuditLog({ actorId: admin.id as number, action: "user.role.remove", targetType: "user", targetId: userId, details: { role_id: remove_role } });
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
    writeAuditLog({ actorId: admin.id as number, action: "user.permission.set", targetType: "user", targetId: userId, details: { permission: add_permission.action.trim(), type: add_permission.type, scope } });
  }
  if (remove_permission_action) {
    await db`DELETE FROM user_permissions WHERE user_id = ${userId} AND action = ${remove_permission_action}`;
    writeAuditLog({ actorId: admin.id as number, action: "user.permission.remove", targetType: "user", targetId: userId, details: { permission: remove_permission_action } });
  }

  // Return updated roles, permissions, and practices
  const [roles, userPermissions, practices] = await Promise.all([
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
    db`
      SELECT p.id, p.name, p.slug
      FROM user_practices up
      JOIN practices p ON p.id = up.practice_id
      WHERE up.user_id = ${userId}
      ORDER BY p.name
    `,
  ]);

  return NextResponse.json({ user: { ...updated, roles, user_permissions: userPermissions, practices } });
}

// DELETE /api/users/[id] — remove a user and all their associated data
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await apiRequireTier("admin");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Cannot delete yourself
  if ((admin.id as number) === userId) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 403 });
  }

  // Cannot delete the owner
  const [target] = await db`SELECT id, account_type FROM users WHERE id = ${userId}`;
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.account_type === "owner") {
    return NextResponse.json({ error: "Owner account cannot be deleted" }, { status: 403 });
  }

  // Cascade: user_roles, user_permissions, oauth_sessions deleted via ON DELETE CASCADE
  await db`DELETE FROM users WHERE id = ${userId}`;
  writeAuditLog({ actorId: admin.id as number, action: "user.delete", targetType: "user", targetId: userId, details: { account_type: target.account_type } });

  return NextResponse.json({ ok: true });
}
