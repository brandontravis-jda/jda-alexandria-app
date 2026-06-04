import { requireTier } from "@/lib/portal-auth";
import { AdminSubnav } from "@/components/portal/AdminSubnav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTier("admin");

  return (
    <div>
      <AdminSubnav />
      {children}
    </div>
  );
}
