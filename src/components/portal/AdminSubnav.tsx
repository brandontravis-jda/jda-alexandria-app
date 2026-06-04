"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavItems = [
  { label: "Users", href: "/admin/users" },
  { label: "Roles", href: "/admin/roles" },
  { label: "Practices", href: "/admin/practices" },
  { label: "Audit Log", href: "/admin/audit-log" },
  { label: "Settings", href: "/admin/settings" },
];

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <div
      className="flex items-center gap-1 px-7 py-2.5 border-b mb-5"
      style={{ borderColor: "var(--color-jda-border)", background: "rgba(255,255,255,0.02)" }}
    >
      <span
        className="text-xs font-bold uppercase tracking-wider mr-3"
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "0.1em",
          color: "var(--color-jda-warm-gray)",
        }}
      >
        Admin
      </span>
      <nav className="flex gap-0.5">
        {adminNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1 text-xs font-medium rounded transition-all duration-150"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "0.05em",
                textDecoration: "none",
                color: isActive ? "var(--color-jda-cream)" : "var(--color-jda-warm-gray)",
                background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
