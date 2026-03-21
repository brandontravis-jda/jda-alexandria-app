type PracticeStatus = "green" | "amber" | "gray";

interface PracticeRowProps {
  name: string;
  meta: string;
  progress: number;
  status: PracticeStatus;
}

const statusColors: Record<PracticeStatus, string> = {
  green: "var(--color-jda-green)",
  amber: "var(--color-jda-amber)",
  gray: "var(--color-jda-warm-gray)",
};

export function PracticeRow({ name, meta, progress, status }: PracticeRowProps) {
  const color = statusColors[status];
  return (
    <div
      className="flex items-center justify-between py-2.5 border-b last:border-0"
      style={{ borderColor: "var(--color-jda-border)" }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <div>
          <div className="text-sm font-medium" style={{ color: "var(--color-jda-cream)" }}>{name}</div>
          <div className="text-xs" style={{ color: "var(--color-jda-warm-gray)" }}>{meta}</div>
        </div>
      </div>
      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-jda-bg-surface)" }}>
        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: color }} />
      </div>
    </div>
  );
}
