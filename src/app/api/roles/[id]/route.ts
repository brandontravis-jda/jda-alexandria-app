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

// POST /api/roles/[id]/permissions — add a permission to a role
// DELETE /api/roles/[id]/permissions?permissionId=<uuid> — remove a permission
// These are handled via PATCH with an action field for simplicity

// PATCH /api/roles/[id] — add or remove a permission (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roleId } = await params;

  const body = await request.json().catch(() => ({}));
  const { add_permission, remove_permission_id } = body as {
    add_permission?: { action: string; scope: string };
    remove_permission_id?: string;
  };

  // Verify role exists
  const [role] = await db`SELECT id, is_system FROM roles WHERE id = ${roleId}`;
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  if (add_permission) {
    const validScopes = ["own_practice", "all", "none"];
    if (!add_permission.action?.trim()) return NextResponse.json({ error: "action is required" }, { status: 400 });
    if (!validScopes.includes(add_permission.scope)) return NextResponse.json({ error: "Invalid scope" }, { status: 400 });

    await db`
      INSERT INTO permissions (role_id, action, scope)
      VALUES (${roleId}, ${add_permission.action.trim()}, ${add_permission.scope})
      ON CONFLICT (role_id, action) DO UPDATE SET scope = EXCLUDED.scope
    `;
  }

  if (remove_permission_id) {
    await db`DELETE FROM permissions WHERE id = ${remove_permission_id} AND role_id = ${roleId}`;
  }

  // Return updated permissions
  const permissions = await db`
    SELECT id, action, scope FROM permissions WHERE role_id = ${roleId} ORDER BY action
  `;

  return NextResponse.json({ permissions });
}

// DELETE /api/roles/[id] — delete a role (admin only, cannot delete system roles)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roleId } = await params;

  const [role] = await db`SELECT id, is_system FROM roles WHERE id = ${roleId}`;
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.is_system) return NextResponse.json({ error: "System roles cannot be deleted" }, { status: 403 });

  await db`DELETE FROM roles WHERE id = ${roleId}`;
  return NextResponse.json({ deleted: true });
}
