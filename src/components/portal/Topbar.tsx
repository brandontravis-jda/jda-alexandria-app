"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Content", href: "/content" },
  { label: "Clients", href: "/clients" },
  { label: "Tools", href: "/tools" },
  { label: "Settings", href: "/settings" },
];

interface TopbarProps {
  userName?: string | null;
  userInitials?: string;
}

export function Topbar({ userName, userInitials }: TopbarProps) {
  const pathname = usePathname();

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
          {navItems.map((item) => {
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
        <form action="/api/auth/signout" method="POST">
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
