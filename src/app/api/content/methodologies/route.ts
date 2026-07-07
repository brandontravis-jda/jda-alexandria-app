import { apiRequireTier } from "@/lib/portal-auth";
import { db, jsonb } from "@/lib/db";
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

  const methodologies = await db`
    SELECT m.id, m.name, m.slug, m.description, m.practice_id,
           m.ai_classification, m.proven_status, m.version, m.author,
           m.status, m.created_at, m.updated_at,
           p.name AS practice_name
    FROM methodologies m
    LEFT JOIN practices p ON p.id = m.practice_id
    ORDER BY m.name
  `;

  return NextResponse.json({ methodologies });
}

export async function POST(request: Request) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    name, slug: rawSlug, description, practice_id, ai_classification,
    tools_involved, required_inputs, system_instructions, steps,
    output_format, quality_checks, failure_modes, vision_of_good, tips,
    client_refinements, quality_checklist, baseline_production_time,
    ai_native_production_time, proven_status, proven_date, version,
    author, validated_by, include_feedback_prompt, status,
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
      INSERT INTO methodologies (
        name, slug, description, practice_id, ai_classification,
        tools_involved, required_inputs, system_instructions, steps,
        output_format, quality_checks, failure_modes, vision_of_good, tips,
        client_refinements, quality_checklist, baseline_production_time,
        ai_native_production_time, proven_status, proven_date, version,
        author, validated_by, include_feedback_prompt, status
      ) VALUES (
        ${(name as string).trim()},
        ${slug},
        ${(description as string) ?? ""},
        ${(practice_id as number) ?? null},
        ${(ai_classification as string) ?? null},
        ${(tools_involved as string[]) ?? []},
        ${jsonb(required_inputs ?? [])},
        ${(system_instructions as string) ?? ""},
        ${jsonb(steps ?? [])},
        ${(output_format as string) ?? ""},
        ${jsonb(quality_checks ?? [])},
        ${jsonb(failure_modes ?? [])},
        ${(vision_of_good as string) ?? ""},
        ${(tips as string) ?? ""},
        ${jsonb(client_refinements ?? [])},
        ${jsonb(quality_checklist ?? [])},
        ${(baseline_production_time as string) ?? null},
        ${(ai_native_production_time as string) ?? null},
        ${(proven_status as boolean) ?? false},
        ${(proven_date as string) ?? null},
        ${(version as number) ?? 1},
        ${(author as string) ?? null},
        ${(validated_by as string) ?? null},
        ${(include_feedback_prompt as boolean) ?? false},
        ${(status as string) ?? "active"}
      )
      RETURNING *
    `;

    writeAuditLog({
      actorId: editor.id as number,
      action: "methodology.create",
      targetType: "methodology",
      targetId: row.id as number,
      details: { name: (name as string).trim(), slug },
    });

    return NextResponse.json({ methodology: row }, { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "A methodology with that slug already exists" }, { status: 409 });
    }
    throw err;
  }
}
