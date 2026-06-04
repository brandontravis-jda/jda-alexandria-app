import { requirePortalPermission } from "@/lib/portal-auth";

export default async function RolesLayout({ children }: { children: React.ReactNode }) {
  await requirePortalPermission("portal:admin");
  return <>{children}</>;
}
