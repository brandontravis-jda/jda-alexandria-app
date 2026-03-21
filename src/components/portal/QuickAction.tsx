import Link from "next/link";

type IconColor = "red" | "blue" | "green";

interface QuickActionProps {
  icon: string;
  iconColor: IconColor;
  label: string;
  sub: string;
  href: string;
}

const iconStyles: Record<IconColor, { bg: string; color: string }> = {
  red: { bg: "var(--color-jda-red-muted)", color: "var(--color-jda-red)" },
  blue: { bg: "var(--color-jda-blue-muted)", color: "var(--color-jda-blue)" },
  green: { bg: "var(--color-jda-green-muted)", color: "var(--color-jda-green)" },
};

export function QuickAction({ icon, iconColor, label, sub, href }: QuickActionProps) {
  const { bg, color } = iconStyles[iconColor];
  return (
    <Link
      href={href}
      className="quick-action-btn flex items-center gap-2.5 rounded-lg px-4 py-3.5 border cursor-pointer transition-all duration-150 no-underline"
      style={{
        background: "var(--color-jda-bg-card)",
        borderColor: "var(--color-jda-border)",
      }}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-black flex-shrink-0"
        style={{ background: bg, color, fontFamily: "var(--font-display)" }}
      >
        {icon}
      </div>
      <div>
        <div
          className="text-xs font-semibold"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}
        >
          {label}
        </div>
        <div className="text-xs" style={{ color: "var(--color-jda-warm-gray)" }}>{sub}</div>
      </div>
    </Link>
  );
}
