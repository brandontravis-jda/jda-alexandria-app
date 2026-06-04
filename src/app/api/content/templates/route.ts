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

  const templates = await db`
    SELECT t.*,
      COALESCE(
        (SELECT json_agg(json_build_object('id', p.id, 'name', p.name))
         FROM template_practices tp
         JOIN practices p ON p.id = tp.practice_id
         WHERE tp.template_id = t.id), '[]'::json
      ) AS practice_areas,
      COALESCE(
        (SELECT json_agg(json_build_object('id', m.id, 'name', m.name))
         FROM template_methodologies tm
         JOIN methodologies m ON m.id = tm.methodology_id
         WHERE tm.template_id = t.id), '[]'::json
      ) AS related_methodologies
    FROM templates t
    ORDER BY t.title
  `;

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    title, slug: rawSlug, format_type, preview_url, github_raw_url,
    dropbox_link, use_cases, feature_list, fixed_elements,
    variable_elements, brand_injection_rules, client_adaptation_notes,
    output_spec, quality_checks, include_feedback_prompt, status,
    practice_ids, methodology_ids,
  } = body as Record<string, unknown>;

  if (!title || !(title as string).trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const slug = (rawSlug as string)?.trim() || slugify((title as string).trim());
  if (!slug) {
    return NextResponse.json({ error: "Title must produce a valid slug" }, { status: 400 });
  }

  try {
    const [row] = await db`
      INSERT INTO templates (
        title, slug, format_type, preview_url, github_raw_url,
        dropbox_link, use_cases, feature_list, fixed_elements,
        variable_elements, brand_injection_rules, client_adaptation_notes,
        output_spec, quality_checks, include_feedback_prompt, status
      ) VALUES (
        ${(title as string).trim()},
        ${slug},
        ${(format_type as string) ?? null},
        ${(preview_url as string) ?? null},
        ${(github_raw_url as string) ?? null},
        ${(dropbox_link as string) ?? null},
        ${(use_cases as string) ?? ""},
        ${(feature_list as string) ?? ""},
        ${(fixed_elements as string) ?? ""},
        ${(variable_elements as string) ?? ""},
        ${(brand_injection_rules as string) ?? ""},
        ${(client_adaptation_notes as string) ?? ""},
        ${(output_spec as string) ?? ""},
        ${(quality_checks as string) ?? ""},
        ${(include_feedback_prompt as boolean) ?? false},
        ${(status as string) ?? "draft"}
      )
      RETURNING *
    `;

    const templateId = row.id as number;

    if (Array.isArray(practice_ids) && practice_ids.length > 0) {
      await db`
        INSERT INTO template_practices (template_id, practice_id)
        SELECT ${templateId}, unnest(${practice_ids as number[]}::int[])
      `;
    }

    if (Array.isArray(methodology_ids) && methodology_ids.length > 0) {
      await db`
        INSERT INTO template_methodologies (template_id, methodology_id)
        SELECT ${templateId}, unnest(${methodology_ids as number[]}::int[])
      `;
    }

    writeAuditLog({
      actorId: editor.id as number,
      action: "template.create",
      targetType: "template",
      targetId: templateId,
      details: { title: (title as string).trim(), slug },
    });

    return NextResponse.json({ template: row }, { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "A template with that slug already exists" }, { status: 409 });
    }
    throw err;
  }
}
