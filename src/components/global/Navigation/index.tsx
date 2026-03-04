"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavigationProps, NavItem } from "./types";

export default function Navigation({ data, siteTitle }: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const firstLink = mobileMenuRef.current?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        toggleRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  if (!data?.items?.length) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-background/95 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-[var(--container-content)] items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
      >
        <a href="/" className="font-display text-xl font-bold text-brand-primary">
          {siteTitle || "JDA Catalyst"}
        </a>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-1 md:flex">
          {data.items.map((item, i) => (
            <DesktopNavItem key={`${item.url}-${i}`} item={item} pathname={pathname} />
          ))}
        </ul>

        {/* Mobile toggle */}
        <button
          ref={toggleRef}
          type="button"
          className="inline-flex items-center justify-center rounded p-2 text-brand-text hover:bg-brand-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="mobile-menu" ref={mobileMenuRef} className="border-t border-brand-border md:hidden">
          <ul className="space-y-1 px-4 py-4">
            {data.items.map((item, i) => (
              <MobileNavItem key={`${item.url}-${i}`} item={item} pathname={pathname} />
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}

function DesktopNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
  const menuId = `desktop-menu-${item.url.replace(/\W/g, "")}`;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!hasChildren || !open) return;

      const items = menuRef.current?.querySelectorAll<HTMLElement>("a");
      if (!items?.length) return;

      const currentIndex = Array.from(items).findIndex(
        (el) => el === document.activeElement
      );

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          items[currentIndex < items.length - 1 ? currentIndex + 1 : 0]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          items[currentIndex > 0 ? currentIndex - 1 : items.length - 1]?.focus();
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          (ref.current?.querySelector("button") as HTMLElement)?.focus();
          break;
      }
    },
    [hasChildren, open]
  );

  if (!hasChildren) {
    return (
      <li>
        <a
          href={item.url}
          target={item.isExternal ? "_blank" : undefined}
          rel={item.isExternal ? "noopener noreferrer" : undefined}
          aria-label={item.isExternal ? `${item.label} (opens in new tab)` : undefined}
          className={cn(
            "rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-brand-surface hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary",
            isActive ? "text-brand-secondary" : "text-brand-text"
          )}
        >
          {item.label}
        </a>
      </li>
    );
  }

  return (
    <li ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1 rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-brand-surface hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary",
          isActive ? "text-brand-secondary" : "text-brand-text"
        )}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
      >
        {item.label}
        <svg
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          ref={menuRef}
          id={menuId}
          role="menu"
          className="absolute left-0 top-full mt-1 min-w-[200px] rounded border border-brand-border bg-brand-background py-1 shadow-lg"
        >
          {item.children!.map((child) => (
            <li key={child.url} role="none">
              <a
                href={child.url}
                role="menuitem"
                target={child.isExternal ? "_blank" : undefined}
                rel={child.isExternal ? "noopener noreferrer" : undefined}
                aria-label={child.isExternal ? `${child.label} (opens in new tab)` : undefined}
                className="block px-4 py-2 text-sm text-brand-text hover:bg-brand-surface hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-secondary"
              >
                {child.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function MobileNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
  const menuId = `mobile-submenu-${item.url.replace(/\W/g, "")}`;

  if (!hasChildren) {
    return (
      <li>
        <a
          href={item.url}
          target={item.isExternal ? "_blank" : undefined}
          rel={item.isExternal ? "noopener noreferrer" : undefined}
          aria-label={item.isExternal ? `${item.label} (opens in new tab)` : undefined}
          className={cn(
            "block rounded px-3 py-2 text-base font-medium hover:bg-brand-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary",
            isActive ? "text-brand-secondary" : "text-brand-text"
          )}
        >
          {item.label}
        </a>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between rounded px-3 py-2 text-base font-medium hover:bg-brand-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary",
          isActive ? "text-brand-secondary" : "text-brand-text"
        )}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
      >
        {item.label}
        <svg
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul id={menuId} className="ml-4 mt-1 space-y-1">
          {item.children!.map((child) => (
            <li key={child.url}>
              <a
                href={child.url}
                target={child.isExternal ? "_blank" : undefined}
                rel={child.isExternal ? "noopener noreferrer" : undefined}
                aria-label={child.isExternal ? `${child.label} (opens in new tab)` : undefined}
                className="block rounded px-3 py-2 text-sm text-brand-muted hover:bg-brand-surface hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
              >
                {child.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
