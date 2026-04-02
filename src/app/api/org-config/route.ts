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

// GET /api/org-config — return current org config (admin only)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [config] = await db`
    SELECT oc.default_role_id, r.display_name AS default_role_name, r.slug AS default_role_slug
    FROM org_config oc
    LEFT JOIN roles r ON r.id = oc.default_role_id
    WHERE oc.id = 1
  `;

  return NextResponse.json({ config: config ?? { default_role_id: null, default_role_name: null, default_role_slug: null } });
}

// PATCH /api/org-config — update default_role_id (admin only)
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { default_role_id } = body as { default_role_id?: string };

  if (!default_role_id) return NextResponse.json({ error: "default_role_id is required" }, { status: 400 });

  // Verify role exists
  const [role] = await db`SELECT id, display_name, slug FROM roles WHERE id = ${default_role_id}`;
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  await db`
    INSERT INTO org_config (id, default_role_id) VALUES (1, ${default_role_id})
    ON CONFLICT (id) DO UPDATE SET default_role_id = EXCLUDED.default_role_id
  `;

  return NextResponse.json({ config: { default_role_id: role.id, default_role_name: role.display_name, default_role_slug: role.slug } });
}
