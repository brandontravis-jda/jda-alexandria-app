import { requirePortalPermission } from "@/lib/portal-auth";

export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  await requirePortalPermission("portal:content");
  return <>{children}</>;
}
