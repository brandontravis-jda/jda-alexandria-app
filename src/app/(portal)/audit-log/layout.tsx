import { requireTier } from "@/lib/portal-auth";

export default async function AuditLogLayout({ children }: { children: React.ReactNode }) {
  await requireTier("admin");
  return <>{children}</>;
}
