import { requirePortalPermission } from "@/lib/portal-auth";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePortalPermission("portal:admin");
  return <>{children}</>;
}
