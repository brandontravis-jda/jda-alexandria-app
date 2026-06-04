import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserByObjectId, TIER_LEVEL } from "@/lib/schema";

export type PortalTier = "none" | "viewer" | "editor" | "leadership" | "admin";

/**
 * Server-side guard for portal pages. Checks that the user's portal_tier
 * meets or exceeds the required minimum tier. Redirects to /no-access if not.
 */
export async function requireTier(
  minTier: PortalTier
): Promise<{ userId: number; accountType: string; portalTier: PortalTier }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await getUserByObjectId(session.user.id);
  if (!user) redirect("/sign-in");

  const userTier = (user.portal_tier as PortalTier) ?? "none";
  const userLevel = TIER_LEVEL[userTier] ?? 0;
  const requiredLevel = TIER_LEVEL[minTier] ?? 0;

  if (userLevel < requiredLevel) {
    redirect("/no-access");
  }

  return {
    userId: user.id as number,
    accountType: user.account_type as string,
    portalTier: userTier,
  };
}

/**
 * API-level tier check. Returns the user if they meet the tier, null otherwise.
 */
export async function apiRequireTier(minTier: PortalTier) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await getUserByObjectId(session.user.id);
  if (!user) return null;

  const userTier = (user.portal_tier as string) ?? "none";
  const userLevel = TIER_LEVEL[userTier] ?? 0;
  const requiredLevel = TIER_LEVEL[minTier] ?? 0;

  if (userLevel < requiredLevel) return null;

  return user;
}
