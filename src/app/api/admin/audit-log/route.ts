import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserByObjectId, migrate } from "@/lib/schema";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await getUserByObjectId(session.user.id);
  if (!user || !["owner", "admin"].includes(user.account_type as string)) return null;
  return user;
}

// GET /api/admin/audit-log — paginated audit log for admin portal
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await migrate();

  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);
  const actionFilter = searchParams.get("action") ?? null;

  const rows = actionFilter
    ? await db`
        SELECT al.id, al.action, al.target_type, al.target_id, al.details, al.created_at,
               u.name AS actor_name, u.email AS actor_email
        FROM audit_log al
        LEFT JOIN users u ON u.id = al.actor_id
        WHERE al.action LIKE ${actionFilter + "%"}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    : await db`
        SELECT al.id, al.action, al.target_type, al.target_id, al.details, al.created_at,
               u.name AS actor_name, u.email AS actor_email
        FROM audit_log al
        LEFT JOIN users u ON u.id = al.actor_id
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

  const [countRow] = actionFilter
    ? await db`SELECT COUNT(*)::int AS total FROM audit_log WHERE action LIKE ${actionFilter + "%"}`
    : await db`SELECT COUNT(*)::int AS total FROM audit_log`;

  return NextResponse.json({
    entries: rows,
    total: countRow?.total ?? 0,
    limit,
    offset,
  });
}
