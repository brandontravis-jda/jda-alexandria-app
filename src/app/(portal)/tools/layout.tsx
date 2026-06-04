import { requirePortalPermission } from "@/lib/portal-auth";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  await requirePortalPermission("portal:performance");
  return <>{children}</>;
}
