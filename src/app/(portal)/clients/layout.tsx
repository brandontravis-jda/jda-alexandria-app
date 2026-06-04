import { requireTier } from "@/lib/portal-auth";

export default async function ClientsLayout({ children }: { children: React.ReactNode }) {
  await requireTier("viewer");
  return <>{children}</>;
}
