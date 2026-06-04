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

export async function GET() {
  const user = await apiRequireTier("viewer");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deliverables = await db`
    SELECT dc.*, p.name AS practice_name
    FROM deliverable_classifications dc
    LEFT JOIN practices p ON p.id = dc.practice_id
    ORDER BY dc.name
  `;

  return NextResponse.json({ deliverables });
}

export async function POST(request: Request) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    name, slug: rawSlug, practice_id, ai_classification,
    description, status,
  } = body as Record<string, unknown>;

  if (!name || !(name as string).trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = (rawSlug as string)?.trim() || slugify((name as string).trim());
  if (!slug) {
    return NextResponse.json({ error: "Name must produce a valid slug" }, { status: 400 });
  }

  try {
    const [row] = await db`
      INSERT INTO deliverable_classifications (
        name, slug, practice_id, ai_classification, description, status
      ) VALUES (
        ${(name as string).trim()},
        ${slug},
        ${(practice_id as number) ?? null},
        ${(ai_classification as string) ?? null},
        ${(description as string) ?? ""},
        ${(status as string) ?? "active"}
      )
      RETURNING *
    `;

    writeAuditLog({
      actorId: editor.id as number,
      action: "deliverable.create",
      targetType: "deliverable",
      targetId: row.id as number,
      details: { name: (name as string).trim(), slug },
    });

    return NextResponse.json({ deliverable: row }, { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "A deliverable classification with that slug already exists" }, { status: 409 });
    }
    throw err;
  }
}
