"use client";

import { useEffect, useState, useCallback } from "react";

interface AuditEntry {
  id: number;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
}

const PAGE_SIZE = 50;

const ACTION_COLORS: Record<string, string> = {
  "user.": "#60a5fa",
  "role.": "#a78bfa",
  "practice.": "#34d399",
  "ad.": "#fbbf24",
};

function getActionColor(action: string): string {
  for (const [prefix, color] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(prefix)) return color;
  }
  return "var(--color-jda-text-muted)";
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (actionFilter) params.set("action", actionFilter);

    const res = await fetch(`/api/admin/audit-log?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
    }
    setLoading(false);
  }, [offset, actionFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--color-jda-cream)", fontFamily: "var(--font-display)" }}
        >
          Audit Log
        </h1>

        <div className="flex items-center gap-3">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
            className="text-sm px-3 py-1.5 rounded"
            style={{
              background: "var(--color-jda-card)",
              color: "var(--color-jda-cream)",
              border: "1px solid var(--color-jda-border)",
            }}
          >
            <option value="">All actions</option>
            <option value="user.">User actions</option>
            <option value="role.">Role actions</option>
            <option value="practice.">Practice actions</option>
            <option value="ad.">AD Sync</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--color-jda-text-muted)" }}>Loading...</p>
      ) : entries.length === 0 ? (
        <p style={{ color: "var(--color-jda-text-muted)" }}>No audit entries found.</p>
      ) : (
        <>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-jda-border)" }}>
            <table className="w-full text-sm" style={{ color: "var(--color-jda-text)" }}>
              <thead>
                <tr style={{ background: "var(--color-jda-card)", borderBottom: "1px solid var(--color-jda-border)" }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--color-jda-cream)", fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
                    Time
                  </th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--color-jda-cream)", fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
                    Actor
                  </th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--color-jda-cream)", fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
                    Action
                  </th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--color-jda-cream)", fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
                    Target
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    className="cursor-pointer"
                    style={{
                      borderBottom: "1px solid var(--color-jda-border)",
                      background: expanded === entry.id ? "rgba(255,255,255,0.03)" : "transparent",
                    }}
                  >
                    <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: "var(--color-jda-text-muted)" }}>
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {entry.actor_name ?? entry.actor_email ?? (
                        <span style={{ color: "var(--color-jda-text-muted)" }}>System</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-mono font-semibold"
                        style={{ background: `${getActionColor(entry.action)}20`, color: getActionColor(entry.action) }}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--color-jda-text-muted)" }}>
                      {entry.target_type ? `${entry.target_type}:${entry.target_id}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded details */}
          {expanded && (() => {
            const entry = entries.find((e) => e.id === expanded);
            if (!entry?.details) return null;
            return (
              <div
                className="mt-2 p-4 rounded-lg text-xs font-mono"
                style={{
                  background: "var(--color-jda-card)",
                  border: "1px solid var(--color-jda-border)",
                  color: "var(--color-jda-text)",
                }}
              >
                <pre className="whitespace-pre-wrap">{JSON.stringify(entry.details, null, 2)}</pre>
              </div>
            );
          })()}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
                {total} total entries — page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="text-xs px-3 py-1 rounded"
                  style={{
                    background: "var(--color-jda-card)",
                    color: offset === 0 ? "var(--color-jda-text-muted)" : "var(--color-jda-cream)",
                    border: "1px solid var(--color-jda-border)",
                    cursor: offset === 0 ? "default" : "pointer",
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                  className="text-xs px-3 py-1 rounded"
                  style={{
                    background: "var(--color-jda-card)",
                    color: offset + PAGE_SIZE >= total ? "var(--color-jda-text-muted)" : "var(--color-jda-cream)",
                    border: "1px solid var(--color-jda-border)",
                    cursor: offset + PAGE_SIZE >= total ? "default" : "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
