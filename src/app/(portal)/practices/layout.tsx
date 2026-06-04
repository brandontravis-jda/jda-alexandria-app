import { requirePortalPermission } from "@/lib/portal-auth";

export default async function PracticesLayout({ children }: { children: React.ReactNode }) {
  await requirePortalPermission("portal:admin");
  return <>{children}</>;
}
