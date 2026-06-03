import { auth } from "@/lib/auth";
import { getUserByObjectId } from "@/lib/schema";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_ID = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID!;
const CLIENT_ID = process.env.AUTH_MICROSOFT_ENTRA_ID_ID!;
const CLIENT_SECRET = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!;
const GROUP_ID = "6864b47f-e09f-4faf-bde2-738c1ac014c4"; // Alexandria-Users

interface GraphMember {
  id: string;
  displayName: string | null;
  mail: string | null;
  userPrincipalName: string | null;
}

async function getAppToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get app token: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function fetchGroupMembers(token: string): Promise<GraphMember[]> {
  const members: GraphMember[] = [];
  let url: string | null =
    `https://graph.microsoft.com/v1.0/groups/${GROUP_ID}/members?$select=id,displayName,mail,userPrincipalName&$top=999`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Graph API error: ${res.status} ${text}`);
    }
    const data = (await res.json()) as {
      value: GraphMember[];
      "@odata.nextLink"?: string;
    };
    members.push(...data.value);
    url = data["@odata.nextLink"] ?? null;
  }

  return members;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await getUserByObjectId(session.user.id);
  if (!user) return null;
  if (!["owner", "admin"].includes(user.account_type as string)) return null;
  return user;
}

// POST /api/admin/sync-users — manual trigger or cron
export async function POST(req: NextRequest) {
  // Allow cron calls via secret header, or authenticated admin calls
  const cronSecret = req.headers.get("authorization");
  const isCron =
    cronSecret === `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET;

  if (!isCron) {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json(
        { error: "AD sync failed", detail: `Missing env vars: ${!TENANT_ID ? "TENANT_ID " : ""}${!CLIENT_ID ? "CLIENT_ID " : ""}${!CLIENT_SECRET ? "CLIENT_SECRET" : ""}`.trim() },
        { status: 500 }
      );
    }

    const token = await getAppToken();
    const members = await fetchGroupMembers(token);
    const memberObjectIds = new Set(members.map((m) => m.id));

    let created = 0;
    let updated = 0;
    let disabled = 0;

    // Check if any owner exists (first-user logic)
    const [ownerCheck] = await db`SELECT id FROM users WHERE account_type = 'owner' LIMIT 1`;
    const ownerExists = !!ownerCheck;

    // Upsert each AD group member
    for (const member of members) {
      const email =
        member.mail ?? member.userPrincipalName ?? null;

      const [existing] = await db`
        SELECT id, portal_access, mcp_access FROM users WHERE object_id = ${member.id}
      `;

      if (existing) {
        await db`
          UPDATE users
          SET
            email = COALESCE(${email}, email),
            name  = COALESCE(${member.displayName}, name)
          WHERE object_id = ${member.id}
        `;
        updated++;
      } else {
        const isFirstUser = !ownerExists && created === 0;

        const [newUser] = await db`
          INSERT INTO users (object_id, email, name, account_type, portal_access, mcp_access)
          VALUES (
            ${member.id},
            ${email},
            ${member.displayName},
            ${isFirstUser ? "owner" : "user"},
            ${isFirstUser},
            false
          )
          RETURNING id
        `;

        // Assign default role
        await db`
          INSERT INTO user_roles (user_id, role_id)
          SELECT ${newUser.id as number}, oc.default_role_id
          FROM org_config oc
          WHERE oc.default_role_id IS NOT NULL
          ON CONFLICT (user_id, role_id) DO NOTHING
        `;

        created++;
      }
    }

    // Soft-disable users no longer in the AD group
    // (skip owners/admins — they're never auto-disabled)
    const allUsers = await db`
      SELECT id, object_id, account_type, portal_access, mcp_access
      FROM users
      WHERE account_type = 'user'
    `;

    for (const user of allUsers) {
      if (!memberObjectIds.has(user.object_id as string)) {
        if (user.portal_access || user.mcp_access) {
          await db`
            UPDATE users
            SET portal_access = false, mcp_access = false
            WHERE id = ${user.id as number}
          `;
          disabled++;
        }
      }
    }

    // Record sync timestamp
    await db`
      INSERT INTO org_config (id, last_ad_sync)
      VALUES (1, NOW())
      ON CONFLICT (id) DO UPDATE SET last_ad_sync = NOW()
    `;

    return NextResponse.json({
      ok: true,
      members_in_group: members.length,
      created,
      updated,
      disabled,
      synced_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("AD sync failed:", err);
    return NextResponse.json(
      { error: "AD sync failed", detail: String(err) },
      { status: 500 }
    );
  }
}
