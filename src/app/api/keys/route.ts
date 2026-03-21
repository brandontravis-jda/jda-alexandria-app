import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserByObjectId } from "@/lib/schema";
import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";

// GET /api/keys — list keys for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByObjectId(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const keys = await db`
    SELECT id, name, key_prefix, created_at, last_used_at
    FROM api_keys
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ keys });
}

// POST /api/keys — create a new key
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByObjectId(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Default";

  // Generate key: alx_ prefix + 32 random bytes as hex
  const rawKey = "alx_" + randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);

  await db`
    INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
    VALUES (${user.id}, ${keyHash}, ${keyPrefix}, ${name})
  `;

  // Return the raw key once — it cannot be retrieved again
  return NextResponse.json({ key: rawKey, prefix: keyPrefix, name });
}

// DELETE /api/keys?id=<id> — revoke a key
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByObjectId(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing key id" }, { status: 400 });

  const result = await db`
    DELETE FROM api_keys WHERE id = ${id} AND user_id = ${user.id} RETURNING id
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
