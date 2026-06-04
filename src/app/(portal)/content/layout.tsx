import { requireTier } from "@/lib/portal-auth";

export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  await requireTier("viewer");
  return <>{children}</>;
}
