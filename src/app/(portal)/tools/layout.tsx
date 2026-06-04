import { requireTier } from "@/lib/portal-auth";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  await requireTier("leadership");
  return <>{children}</>;
}
