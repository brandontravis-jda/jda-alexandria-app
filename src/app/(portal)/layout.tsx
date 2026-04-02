import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
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
