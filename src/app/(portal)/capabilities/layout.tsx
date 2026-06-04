import { requirePortalPermission } from "@/lib/portal-auth";

export default async function CapabilitiesLayout({ children }: { children: React.ReactNode }) {
  await requirePortalPermission("portal:content");
  return <>{children}</>;
}
