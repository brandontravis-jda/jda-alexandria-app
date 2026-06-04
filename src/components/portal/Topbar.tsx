"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/sign-out/actions";

const TIER_LEVEL: Record<string, number> = {
  none: 0,
  viewer: 1,
  editor: 2,
  leadership: 3,
  admin: 4,
};

const navItems: { label: string; href: string; minTier: string }[] = [
  { label: "Dashboard", href: "/",              minTier: "viewer" },
  { label: "Capabilities", href: "/capabilities", minTier: "viewer" },
  { label: "Content", href: "/content",         minTier: "viewer" },
  { label: "Clients", href: "/clients",         minTier: "viewer" },
  { label: "Tools", href: "/tools",             minTier: "leadership" },
  { label: "Users", href: "/users",             minTier: "admin" },
  { label: "Roles", href: "/roles",             minTier: "admin" },
  { label: "Practices", href: "/practices",     minTier: "admin" },
  { label: "Audit Log", href: "/audit-log",     minTier: "admin" },
  { label: "Settings", href: "/settings",       minTier: "admin" },
];

interface TopbarProps {
  userName?: string | null;
  userInitials?: string;
  portalTier?: string;
}

export function Topbar({ userName, userInitials, portalTier = "none" }: TopbarProps) {
  const pathname = usePathname();
  const userLevel = TIER_LEVEL[portalTier] ?? 0;
  const visibleNav = navItems.filter(
    (item) => userLevel >= (TIER_LEVEL[item.minTier] ?? 0)
  );

  return (
    <header
      className="flex items-center justify-between px-7 py-4 border-b"
      style={{ borderColor: "var(--color-jda-border)" }}
    >
      <div className="flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div
            className="w-8 h-8 rounded flex items-center justify-center text-white font-black text-sm"
            style={{ background: "var(--color-jda-red)", letterSpacing: "-0.5px", fontFamily: "var(--font-display)" }}
          >
            JDA
          </div>
          <div>
            <div
              className="font-bold text-lg leading-none"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", color: "var(--color-jda-cream)" }}
            >
              ALEXANDRIA
            </div>
            <div
              className="text-xs font-normal leading-none mt-0.5"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.2em", color: "var(--color-jda-warm-gray)", textTransform: "uppercase" }}
            >
              AI-Native Operations
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex gap-1">
          {visibleNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all duration-150"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: isActive ? "var(--color-jda-cream)" : "var(--color-jda-warm-gray)",
                  background: isActive ? "var(--color-jda-red)" : "transparent",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User */}
      <div className="flex items-center gap-4">
        {userName && (
          <span className="text-sm" style={{ color: "var(--color-jda-cream-muted)" }}>
            {userName.split(" ")[0]}
          </span>
        )}
        <form action={signOutAction}>
          <button type="submit" className="p-0 border-0 bg-transparent cursor-pointer">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "var(--color-jda-red)", fontFamily: "var(--font-display)" }}
              title="Sign out"
            >
              {userInitials ?? "?"}
            </div>
          </button>
        </form>
      </div>
    </header>
  );
}
