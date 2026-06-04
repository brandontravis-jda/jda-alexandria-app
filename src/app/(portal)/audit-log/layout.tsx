import { requirePortalPermission } from "@/lib/portal-auth";

export default async function AuditLogLayout({ children }: { children: React.ReactNode }) {
  await requirePortalPermission("portal:admin");
  return <>{children}</>;
}
