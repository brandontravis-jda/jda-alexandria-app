import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserByObjectId } from "@/lib/schema";
import { Topbar } from "@/components/portal/Topbar";
import DebugBanner from "@/components/ui/DebugBanner";
import { DebugProvider } from "@/components/ui/DebugBanner/context";
import type { PortalTier } from "@/lib/portal-auth";

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

  const user = await getUserByObjectId(session.user.id);
  if (!user) redirect("/sign-in");

  const portalTier = (user.portal_tier as PortalTier) ?? "none";

  if (portalTier === "none") {
    redirect("/no-access");
  }

  const userName = session?.user?.name;
  const userInitials = getInitials(userName);

  return (
    <DebugProvider>
      <div className="min-h-screen" style={{ background: "var(--color-jda-bg)" }}>
        <DebugBanner />
        <Topbar
          userName={userName}
          userInitials={userInitials}
          portalTier={portalTier}
        />
        <main id="main-content" className="p-7">
          {children}
        </main>
      </div>
    </DebugProvider>
  );
}
