"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { signOutAction } from "@/app/sign-out/actions";

const TIER_LEVEL: Record<string, number> = {
  none: 0,
  viewer: 1,
  editor: 2,
  leadership: 3,
  admin: 4,
};

const mainNavItems: { label: string; href: string; minTier: string }[] = [
  { label: "Dashboard", href: "/", minTier: "viewer" },
  { label: "Capabilities", href: "/capabilities", minTier: "viewer" },
  { label: "Content", href: "/content", minTier: "viewer" },
  { label: "Clients", href: "/clients", minTier: "viewer" },
  { label: "Tools", href: "/tools", minTier: "leadership" },
];

interface TopbarProps {
  userName?: string | null;
  userInitials?: string;
  portalTier?: string;
}

export function Topbar({ userName, userInitials, portalTier = "none" }: TopbarProps) {
  const pathname = usePathname();
  const userLevel = TIER_LEVEL[portalTier] ?? 0;
  const isAdmin = userLevel >= TIER_LEVEL.admin;
  const visibleNav = mainNavItems.filter(
    (item) => userLevel >= (TIER_LEVEL[item.minTier] ?? 0)
  );

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  const isOnAdmin = pathname.startsWith("/admin");

  return (
    <header
      className="flex items-center justify-between px-7 py-4 border-b"
      style={{ borderColor: "var(--color-jda-border)" }}
    >
      <div className="flex items-center gap-6">
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

      {/* User + dropdown */}
      <div className="relative flex items-center gap-3" ref={dropdownRef}>
        {userName && (
          <span className="text-sm" style={{ color: "var(--color-jda-cream-muted)" }}>
            {userName.split(" ")[0]}
          </span>
        )}
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="p-0 border-0 bg-transparent cursor-pointer"
          aria-label="User menu"
          aria-expanded={dropdownOpen}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{
              background: isOnAdmin ? "var(--color-jda-warm-gray)" : "var(--color-jda-red)",
              fontFamily: "var(--font-display)",
              transition: "background 0.15s",
            }}
          >
            {userInitials ?? "?"}
          </div>
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-2 rounded-lg border py-1 z-50 min-w-[180px]"
            style={{
              background: "var(--color-jda-bg-card)",
              borderColor: "var(--color-jda-border)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {/* Tier badge */}
            <div
              className="px-4 py-2 border-b"
              style={{ borderColor: "var(--color-jda-border)" }}
            >
              <p className="text-xs" style={{ color: "var(--color-jda-warm-gray)", fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {portalTier} tier
              </p>
            </div>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm no-underline transition-colors"
                style={{ color: "var(--color-jda-cream)", fontFamily: "var(--font-body)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 14, opacity: 0.7 }}>⚙</span>
                Admin Panel
              </Link>
            )}

            <Link
              href="/admin/settings"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm no-underline transition-colors"
              style={{ color: "var(--color-jda-cream)", fontFamily: "var(--font-body)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 14, opacity: 0.7 }}>🔑</span>
              API Keys
            </Link>

            <div className="border-t my-1" style={{ borderColor: "var(--color-jda-border)" }} />

            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left border-0 cursor-pointer transition-colors"
                style={{ background: "transparent", color: "var(--color-jda-warm-gray)", fontFamily: "var(--font-body)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 14, opacity: 0.7 }}>↩</span>
                Sign Out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
