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

// GET /api/roles — list all roles with their permissions and user counts (admin only)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = await db`
    SELECT r.id, r.slug, r.display_name, r.description, r.is_system, r.created_at,
           COUNT(DISTINCT ur.user_id)::int AS user_count
    FROM roles r
    LEFT JOIN user_roles ur ON ur.role_id = r.id
    GROUP BY r.id
    ORDER BY r.is_system DESC, r.display_name
  `;

  const permissions = await db`
    SELECT id, role_id, action, scope, created_at
    FROM role_permissions
    ORDER BY action
  `;

  const permsByRole: Record<string, { id: string; action: string; scope: string }[]> = {};
  for (const p of permissions) {
    if (!permsByRole[p.role_id]) permsByRole[p.role_id] = [];
    permsByRole[p.role_id].push({ id: p.id, action: p.action, scope: p.scope });
  }

  const enriched = roles.map((r: Record<string, unknown>) => ({
    ...r,
    permissions: permsByRole[r.id as string] ?? [],
  }));

  return NextResponse.json({ roles: enriched });
}

// POST /api/roles — create a new role (admin only)
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { display_name, description } = body as { display_name?: string; description?: string };

  if (!display_name?.trim()) {
    return NextResponse.json({ error: "display_name is required" }, { status: 400 });
  }

  const slug = display_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  const [role] = await db`
    INSERT INTO roles (slug, display_name, description, is_system, created_by)
    VALUES (${slug}, ${display_name.trim()}, ${description ?? null}, FALSE, ${admin.id as number})
    ON CONFLICT (slug) DO NOTHING
    RETURNING id, slug, display_name, description, is_system, created_at
  `;

  if (!role) return NextResponse.json({ error: "A role with that name already exists" }, { status: 409 });

  return NextResponse.json({ role: { ...role, permissions: [], user_count: 0 } });
}
