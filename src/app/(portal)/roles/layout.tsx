import { requireTier } from "@/lib/portal-auth";

export default async function RolesLayout({ children }: { children: React.ReactNode }) {
  await requireTier("admin");
  return <>{children}</>;
}
