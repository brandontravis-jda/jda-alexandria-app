type ContentType = "prompt" | "template" | "brand" | "workflow";

interface ContentRowProps {
  type: ContentType;
  name: string;
  practice: string;
  date: string;
}

const badges: Record<ContentType, { label: string; bg: string; color: string }> = {
  prompt: { label: "Prompt", bg: "var(--color-jda-red-muted)", color: "var(--color-jda-red)" },
  template: { label: "Template", bg: "var(--color-jda-blue-muted)", color: "var(--color-jda-blue)" },
  brand: { label: "Brand", bg: "var(--color-jda-amber-muted)", color: "var(--color-jda-amber)" },
  workflow: { label: "Workflow", bg: "var(--color-jda-green-muted)", color: "var(--color-jda-green)" },
};

export function ContentRow({ type, name, practice, date }: ContentRowProps) {
  const badge = badges[type];
  return (
    <div
      className="content-row grid items-center gap-3.5 px-3 py-2.5 rounded-md cursor-pointer"
      style={{ gridTemplateColumns: "auto 1fr auto auto" }}
    >
      <span
        className="text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", background: badge.bg, color: badge.color }}
      >
        {badge.label}
      </span>
      <span className="text-sm font-medium truncate" style={{ color: "var(--color-jda-cream)" }}>{name}</span>
      <span className="text-xs whitespace-nowrap" style={{ color: "var(--color-jda-warm-gray)" }}>{practice}</span>
      <span className="text-xs whitespace-nowrap" style={{ color: "var(--color-jda-warm-gray)" }}>{date}</span>
    </div>
  );
}
