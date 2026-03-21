type DotColor = "red" | "blue" | "green" | "amber" | "gray";

interface ActivityItemProps {
  actor: string;
  action: string;
  time: string;
  dotColor?: DotColor;
}

const dotColors: Record<DotColor, string> = {
  red: "var(--color-jda-red)",
  blue: "var(--color-jda-blue)",
  green: "var(--color-jda-green)",
  amber: "var(--color-jda-amber)",
  gray: "var(--color-jda-warm-gray)",
};

export function ActivityItem({ actor, action, time, dotColor = "red" }: ActivityItemProps) {
  return (
    <div className="flex gap-3 items-start">
      <div
        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
        style={{ background: dotColors[dotColor] }}
      />
      <div>
        <div className="text-xs leading-relaxed" style={{ color: "var(--color-jda-cream-muted)" }}>
          <span className="font-bold" style={{ color: "var(--color-jda-cream)" }}>{actor}</span>{" "}
          {action}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--color-jda-warm-gray)" }}>{time}</div>
      </div>
    </div>
  );
}
