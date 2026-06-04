import { requireTier } from "@/lib/portal-auth";

export default async function CapabilitiesLayout({ children }: { children: React.ReactNode }) {
  await requireTier("viewer");
  return <>{children}</>;
}
