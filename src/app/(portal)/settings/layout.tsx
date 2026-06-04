import { requireTier } from "@/lib/portal-auth";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireTier("admin");
  return <>{children}</>;
}
