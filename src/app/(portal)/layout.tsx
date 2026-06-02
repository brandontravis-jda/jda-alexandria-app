import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserByObjectId } from "@/lib/schema";
import { Topbar } from "@/components/portal/Topbar";
import DebugBanner from "@/components/ui/DebugBanner";
import { DebugProvider } from "@/components/ui/DebugBanner/context";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  // Authoritative DB check — catches portal_access revocations between
  // JWT refreshes. Middleware does a fast JWT-based check; this is the
  // fallback that makes revocation effective on next page navigation.
  const user = await getUserByObjectId(session.user.id);
  if (!user) redirect("/sign-in");
  const accountType = user.account_type as string;
  if (accountType !== "owner" && accountType !== "admin" && !user.portal_access) {
    redirect("/sign-in?error=PortalAccessDenied");
  }

  const userName = session?.user?.name;
  const userInitials = getInitials(userName);

  return (
    <DebugProvider>
      <div className="min-h-screen" style={{ background: "var(--color-jda-bg)" }}>
        <DebugBanner />
        <Topbar userName={userName} userInitials={userInitials} />
        <main id="main-content" className="p-7">
          {children}
        </main>
      </div>
    </DebugProvider>
  );
}
