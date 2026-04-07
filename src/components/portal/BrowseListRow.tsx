import Link from "next/link";

interface BrowseListRowProps {
  href: string;
  title: string;
  subtitle?: string;
  right?: string;
}

export default function BrowseListRow({ href, title, subtitle, right }: BrowseListRowProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0 no-underline content-row px-1 -mx-1 rounded-md transition-colors"
      style={{ borderColor: "var(--color-jda-border)" }}
    >
      <div className="min-w-0">
        <div
          className="text-sm font-semibold truncate"
          style={{ fontFamily: "var(--font-body)", color: "var(--color-jda-cream)" }}
        >
          {title}
        </div>
        {subtitle ? (
          <div className="text-xs mt-0.5 truncate" style={{ color: "var(--color-jda-warm-gray)" }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {right ? (
        <span
          className="text-xs font-semibold flex-shrink-0 whitespace-nowrap"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", color: "var(--color-jda-cream-muted)" }}
        >
          {right}
        </span>
      ) : null}
    </Link>
  );
}
