import { apiRequireTier } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await apiRequireTier("viewer");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [row] = await db`SELECT * FROM platform_guide WHERE id = 1`;
  if (!row) {
    return NextResponse.json({
      id: 1,
      platform_intro: "",
      canonical_entry_prompts: [],
      feedback_prompt: "",
      example_prompts: [],
    });
  }
  return NextResponse.json(row);
}

export async function PATCH(request: Request) {
  const user = await apiRequireTier("editor");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const [row] = await db`
    INSERT INTO platform_guide (id, platform_intro, canonical_entry_prompts, feedback_prompt, example_prompts)
    VALUES (
      1,
      ${body.platform_intro ?? ""},
      ${JSON.stringify(body.canonical_entry_prompts ?? [])},
      ${body.feedback_prompt ?? ""},
      ${JSON.stringify(body.example_prompts ?? [])}
    )
    ON CONFLICT (id) DO UPDATE SET
      platform_intro = COALESCE(${body.platform_intro ?? null}, platform_guide.platform_intro),
      canonical_entry_prompts = COALESCE(${body.canonical_entry_prompts ? JSON.stringify(body.canonical_entry_prompts) : null}::jsonb, platform_guide.canonical_entry_prompts),
      feedback_prompt = COALESCE(${body.feedback_prompt ?? null}, platform_guide.feedback_prompt),
      example_prompts = COALESCE(${body.example_prompts ? JSON.stringify(body.example_prompts) : null}::jsonb, platform_guide.example_prompts),
      updated_at = NOW()
    RETURNING *
  `;

  writeAuditLog({ actorId: user.id as number, action: "platform_guide.update", targetType: "platform_guide", targetId: 1, details: body });
  return NextResponse.json(row);
}
