type ChangeColor = "green" | "amber" | "red" | "muted";
type ValueColor = "red" | "cream";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeColor?: ChangeColor;
  valueColor?: ValueColor;
}

const changeColors: Record<ChangeColor, string> = {
  green: "var(--color-jda-green)",
  amber: "var(--color-jda-amber)",
  red: "var(--color-jda-red)",
  muted: "var(--color-jda-warm-gray)",
};

const valueColors: Record<ValueColor, string> = {
  red: "var(--color-jda-red)",
  cream: "var(--color-jda-cream)",
};

export function StatCard({ label, value, change, changeColor = "green", valueColor = "cream" }: StatCardProps) {
  return (
    <div
      className="rounded-[10px] p-5 border"
      style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
    >
      <div
        className="text-xs font-semibold mb-2"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}
      >
        {label}
      </div>
      <div
        className="text-4xl font-black leading-none"
        style={{ fontFamily: "var(--font-display)", color: valueColors[valueColor] }}
      >
        {value}
      </div>
      {change && (
        <div
          className="text-xs mt-1.5 font-medium"
          style={{ color: changeColors[changeColor] }}
        >
          {change}
        </div>
      )}
    </div>
  );
}
