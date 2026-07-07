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

  const brandPackages = await db`
    SELECT id, client_name, slug, status, created_at, updated_at
    FROM brand_packages
    ORDER BY client_name
  `;

  return NextResponse.json({ brand_packages: brandPackages });
}

export async function POST(request: Request) {
  const editor = await apiRequireTier("editor");
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    client_name, slug: rawSlug, abbreviations, logos, logo_usage_rules,
    extracted_date, source_document, extracted_by, gaps, raw_markdown,
    identity, color_palette, color_usage_rules, typography, web_fonts,
    template_overrides, voice_and_tone, brand_architecture,
    visual_direction, key_messaging, status,
  } = body as Record<string, unknown>;

  if (!client_name || !(client_name as string).trim()) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  const slug = (rawSlug as string)?.trim() || slugify((client_name as string).trim());
  if (!slug) {
    return NextResponse.json({ error: "Client name must produce a valid slug" }, { status: 400 });
  }

  try {
    const [row] = await db`
      INSERT INTO brand_packages (
        client_name, slug, abbreviations, logos, logo_usage_rules,
        extracted_date, source_document, extracted_by, gaps, raw_markdown,
        identity, color_palette, color_usage_rules, typography, web_fonts,
        template_overrides, voice_and_tone, brand_architecture,
        visual_direction, key_messaging, status
      ) VALUES (
        ${(client_name as string).trim()},
        ${slug},
        ${(abbreviations as string) ?? null},
        ${jsonb(logos ?? [])},
        ${(logo_usage_rules as string) ?? ""},
        ${(extracted_date as string) ?? null},
        ${(source_document as string) ?? null},
        ${(extracted_by as string) ?? null},
        ${(gaps as string) ?? ""},
        ${(raw_markdown as string) ?? ""},
        ${jsonb(identity ?? {})},
        ${jsonb(color_palette ?? [])},
        ${(color_usage_rules as string) ?? ""},
        ${jsonb(typography ?? {})},
        ${jsonb(web_fonts ?? [])},
        ${(template_overrides as string) ?? ""},
        ${jsonb(voice_and_tone ?? {})},
        ${jsonb(brand_architecture ?? {})},
        ${jsonb(visual_direction ?? {})},
        ${jsonb(key_messaging ?? {})},
        ${(status as string) ?? "active"}
      )
      RETURNING *
    `;

    writeAuditLog({
      actorId: editor.id as number,
      action: "brand_package.create",
      targetType: "brand_package",
      targetId: row.id as number,
      details: { client_name: (client_name as string).trim(), slug },
    });

    return NextResponse.json({ brand_package: row }, { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "A brand package with that slug already exists" }, { status: 409 });
    }
    throw err;
  }
}
