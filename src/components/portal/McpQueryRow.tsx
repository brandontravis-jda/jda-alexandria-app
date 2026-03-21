interface McpQueryRowProps {
  query: string;
  calls: number;
  practice: string;
}

export function McpQueryRow({ query, calls, practice }: McpQueryRowProps) {
  return (
    <div
      className="content-row grid items-center gap-3.5 px-3 py-2.5 rounded-md cursor-pointer"
      style={{ gridTemplateColumns: "1fr auto auto" }}
    >
      <span className="text-xs font-medium font-mono truncate" style={{ color: "var(--color-jda-cream)" }}>
        {query}
      </span>
      <span className="text-xs whitespace-nowrap" style={{ color: "var(--color-jda-warm-gray)" }}>{calls} calls</span>
      <span className="text-xs whitespace-nowrap" style={{ color: "var(--color-jda-warm-gray)" }}>{practice}</span>
    </div>
  );
}
