import { auth } from "@/lib/auth";
import { getUserByObjectId } from "@/lib/schema";
import { client } from "@/sanity/lib/client";
import { NextResponse } from "next/server";

async function requirePortalAccess() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await getUserByObjectId(session.user.id);
  // Gate on portal_access column — set by permissions migration, not hardcoded tier
  if (!user || !user.portal_access) return null;
  return user;
}

export async function GET(req: Request) {
  const user = await requirePortalAccess();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const practiceArea = searchParams.get("practice_area");
  const classification = searchParams.get("classification");
  const status = searchParams.get("status");

  let filter = `_type == "capabilityRecord"`;
  // Scoping: admin sees all; non-admin with a practice assignment sees own practice by default
  const isAdmin = user.tier === "admin";
  if (!isAdmin && user.practice && !practiceArea) {
    filter += ` && practiceArea == "${user.practice}"`;
  } else if (practiceArea) {
    filter += ` && practiceArea == "${practiceArea}"`;
  }
  if (classification) filter += ` && aiClassification == "${classification}"`;
  if (status) filter += ` && status == "${status}"`;

  const records = await client.fetch(
    `*[${filter}] | order(practiceArea asc, deliverableName asc) {
      _id, deliverableName, "slug": slug.current, practiceArea, status,
      aiClassification, baselineProductionTime, aiNativeProductionTime,
      "linkedMethodology": linkedMethodology->{ name, "slug": slug.current },
      source, notes, ceilingLastReviewed, liveSearchEnabled
    }`,
    {},
    { cache: "no-store" }
  );

  // Summary stats
  const stats = {
    total: records.length,
    not_evaluated: records.filter((r: { status: string }) => r.status === "not_evaluated").length,
    classified: records.filter((r: { status: string }) => r.status === "classified").length,
    methodology_built: records.filter((r: { status: string }) => r.status === "methodology_built").length,
    proven_status: records.filter((r: { status: string }) => r.status === "proven_status").length,
    ai_led: records.filter((r: { aiClassification: string }) => r.aiClassification === "ai_led").length,
    ai_assisted: records.filter((r: { aiClassification: string }) => r.aiClassification === "ai_assisted").length,
    human_led: records.filter((r: { aiClassification: string }) => r.aiClassification === "human_led").length,
  };

  return NextResponse.json({ records, stats, userTier: user.tier, userPractice: user.practice });
}
