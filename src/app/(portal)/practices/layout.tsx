import { requireTier } from "@/lib/portal-auth";

export default async function PracticesLayout({ children }: { children: React.ReactNode }) {
  await requireTier("admin");
  return <>{children}</>;
}
