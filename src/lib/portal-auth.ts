import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserByObjectId, resolvePortalPermissions } from "@/lib/schema";

/**
 * Server-side guard for portal pages. Checks that the user has the required
 * portal permission. Redirects to /no-access if not.
 * Returns the resolved permission set for further use if needed.
 */
export async function requirePortalPermission(
  requiredPermission: string
): Promise<{ userId: number; accountType: string; permissions: Set<string> }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await getUserByObjectId(session.user.id);
  if (!user) redirect("/sign-in");

  const permissions = await resolvePortalPermissions(
    user.id as number,
    user.account_type as string
  );

  if (!permissions.has(requiredPermission)) {
    redirect("/no-access");
  }

  return {
    userId: user.id as number,
    accountType: user.account_type as string,
    permissions,
  };
}
