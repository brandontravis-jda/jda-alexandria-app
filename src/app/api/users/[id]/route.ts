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

// PATCH /api/users/[id] — update practice, portal_access, or role assignment (admin only)
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
  const {
    practice,
    portal_access,
    mcp_access,
    add_role,    // role UUID to assign
    remove_role, // role UUID to remove
  } = body as {
    practice?: string;
    portal_access?: boolean;
    mcp_access?: boolean;
    add_role?: string;
    remove_role?: string;
  };

  // Update user fields
  const [updated] = await db`
    UPDATE users SET
      practice     = COALESCE(${practice ?? null}, practice),
      portal_access = COALESCE(${portal_access ?? null}, portal_access),
      mcp_access    = COALESCE(${mcp_access ?? null}, mcp_access)
    WHERE id = ${userId}
    RETURNING id, email, name, tier, practice, portal_access, mcp_access
  `;

  if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Role assignment
  if (add_role) {
    await db`
      INSERT INTO user_roles (user_id, role_id, granted_by)
      VALUES (${userId}, ${add_role}, ${admin.id})
      ON CONFLICT (user_id, role_id) DO NOTHING
    `;
  }

  if (remove_role) {
    await db`DELETE FROM user_roles WHERE user_id = ${userId} AND role_id = ${remove_role}`;
  }

  // Fetch updated roles
  const roles = await db`
    SELECT r.id, r.slug, r.display_name, r.is_system
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = ${userId}
    ORDER BY r.display_name
  `;

  return NextResponse.json({ user: { ...updated, roles } });
}
