import type { ReactNode } from "react";

interface PortalPanelProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function PortalPanel({ title, action, children, className = "" }: PortalPanelProps) {
  return (
    <div
      className={`rounded-[10px] p-6 border ${className}`}
      style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
    >
      <div className="flex items-center justify-between gap-4 mb-5">
        <span
          className="text-sm font-bold"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-jda-cream)",
          }}
        >
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}
