import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-sanity-secret");

    if (secret !== process.env.SANITY_REVALIDATE_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const body = await request.json();
    const { _type } = body;

    if (!_type) {
      return NextResponse.json(
        { error: "Missing document type" },
        { status: 400 }
      );
    }

    const tagMap: Record<string, string[]> = {
      page: ["page"],
      blogPost: ["blogPost"],
      navigation: ["navigation"],
      footer: ["footer"],
      globalSettings: ["globalSettings"],
      teamMember: ["teamMember"],
    };

    const tags = tagMap[_type] || [_type];

    for (const tag of tags) {
      revalidateTag(tag, { expire: 0 });
    }

    return NextResponse.json({
      revalidated: true,
      tags,
      now: Date.now(),
    });
  } catch (err) {
    console.error("Revalidation error:", err);
    return NextResponse.json(
      { error: "Failed to revalidate" },
      { status: 500 }
    );
  }
}
