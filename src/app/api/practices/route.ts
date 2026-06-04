import { auth } from "@/lib/auth";
import { apiRequireTier } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/schema";
import { NextResponse } from "next/server";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// GET /api/practices — list all practices with member counts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const practices = await db`
    SELECT p.id, p.name, p.slug, p.description, p.created_at,
           COUNT(up.user_id)::int AS member_count
    FROM practices p
    LEFT JOIN user_practices up ON up.practice_id = p.id
    GROUP BY p.id
    ORDER BY p.name
  `;

  return NextResponse.json({ practices });
}

// POST /api/practices — create a new practice (admin only)
export async function POST(request: Request) {
  const admin = await apiRequireTier("admin");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { name, description } = body as { name?: string; description?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = slugify(name.trim());
  if (!slug) {
    return NextResponse.json({ error: "Name must contain at least one alphanumeric character" }, { status: 400 });
  }

  try {
    const [practice] = await db`
      INSERT INTO practices (name, slug, description)
      VALUES (${name.trim()}, ${slug}, ${description?.trim() ?? null})
      RETURNING id, name, slug, description, created_at
    `;
    writeAuditLog({ actorId: admin.id as number, action: "practice.create", targetType: "practice", targetId: practice.id as number, details: { name: name.trim(), slug } });
    return NextResponse.json({ practice }, { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "A practice with that name already exists" }, { status: 409 });
    }
    throw err;
  }
}
