import { auth } from "@/lib/auth";
import { Topbar } from "@/components/portal/Topbar";
import DebugBanner from "@/components/ui/DebugBanner";

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
  const userName = session?.user?.name;
  const userInitials = getInitials(userName);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-jda-bg)" }}>
      <DebugBanner />
      <Topbar userName={userName} userInitials={userInitials} />
      <main id="main-content" className="p-7">
        {children}
      </main>
    </div>
  );
}
