import { apiRequireTier } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/schema";
import { NextResponse } from "next/server";

// PATCH /api/roles/[id] — add or remove a permission on a role (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await apiRequireTier("admin");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roleId } = await params;

  const body = await request.json().catch(() => ({}));
  const { display_name, description, add_permission, remove_permission_id } = body as {
    display_name?: string;
    description?: string;
    add_permission?: { action: string; scope: string };
    remove_permission_id?: string;
  };

  const [role] = await db`SELECT id, is_system FROM roles WHERE id = ${roleId}`;
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  // Rename / update description (works on system and non-system roles)
  if (display_name !== undefined || description !== undefined) {
    if (display_name !== undefined && !display_name.trim()) {
      return NextResponse.json({ error: "display_name cannot be empty" }, { status: 400 });
    }
    const newSlug = display_name
      ? display_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
      : undefined;

    await db`
      UPDATE roles SET
        display_name = COALESCE(${display_name?.trim() ?? null}, display_name),
        slug         = COALESCE(${newSlug ?? null}, slug),
        description  = COALESCE(${description ?? null}, description)
      WHERE id = ${roleId}
    `;
  }

  if (add_permission) {
    const validScopes = ["own_practice", "all", "none"];
    if (!add_permission.action?.trim()) return NextResponse.json({ error: "action is required" }, { status: 400 });
    if (!validScopes.includes(add_permission.scope)) return NextResponse.json({ error: "Invalid scope" }, { status: 400 });

    await db`
      INSERT INTO role_permissions (role_id, action, scope)
      VALUES (${roleId}, ${add_permission.action.trim()}, ${add_permission.scope})
      ON CONFLICT (role_id, action) DO UPDATE SET scope = EXCLUDED.scope
    `;
  }

  if (remove_permission_id) {
    await db`DELETE FROM role_permissions WHERE id = ${remove_permission_id} AND role_id = ${roleId}`;
  }

  const [updatedRole] = await db`
    SELECT id, slug, display_name, description, is_system FROM roles WHERE id = ${roleId}
  `;
  const permissions = await db`
    SELECT id, action, scope FROM role_permissions WHERE role_id = ${roleId} ORDER BY action
  `;

  if (display_name !== undefined || description !== undefined) {
    writeAuditLog({ actorId: admin.id as number, action: "role.update", targetType: "role", targetId: roleId, details: { display_name, description } });
  }
  if (add_permission) {
    writeAuditLog({ actorId: admin.id as number, action: "role.permission.add", targetType: "role", targetId: roleId, details: add_permission });
  }
  if (remove_permission_id) {
    writeAuditLog({ actorId: admin.id as number, action: "role.permission.remove", targetType: "role", targetId: roleId, details: { permission_id: remove_permission_id } });
  }

  return NextResponse.json({ role: updatedRole, permissions });
}

// DELETE /api/roles/[id] — delete a role (admin only, cannot delete system roles)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await apiRequireTier("admin");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roleId } = await params;

  const [role] = await db`SELECT id, is_system FROM roles WHERE id = ${roleId}`;
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.is_system) return NextResponse.json({ error: "System roles cannot be deleted" }, { status: 403 });

  await db`DELETE FROM roles WHERE id = ${roleId}`;
  writeAuditLog({ actorId: admin.id as number, action: "role.delete", targetType: "role", targetId: roleId });
  return NextResponse.json({ deleted: true });
}
