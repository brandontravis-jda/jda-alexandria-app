"use client";

import { useEffect, useState } from "react";

interface ToolUsage { tool_name: string; calls: number }
interface UserActivity { user_id: string; name: string | null; email: string | null; calls: number; last_call: string }
interface PracticeUsage { practice_name: string; calls: number }
interface TopItem { slug: string; calls: number; capability_type?: string }
interface RecentCall { tool_name: string; request_summary: string | null; created_at: string; user_name: string | null }
interface Adoption { active_mcp_users: number; total_mcp_enabled: number; total_users: number; total_calls: number }

interface AnalyticsData {
  period_days: number;
  tool_usage: ToolUsage[];
  user_activity: UserActivity[];
  practice_usage: PracticeUsage[];
  top_methodologies: TopItem[];
  top_brands: TopItem[];
  adoption: Adoption;
  recent_activity: RecentCall[];
}

function formatDate(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function LeadershipDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/content/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black leading-none" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
            Performance
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-jda-warm-gray)", fontFamily: "var(--font-body)" }}>
            MCP usage metrics, adoption tracking, and content analytics.
          </p>
        </div>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}
          className="text-xs px-2 py-1.5 rounded-md" style={{ background: "var(--color-jda-card)", color: "var(--color-jda-cream)", border: "1px solid var(--color-jda-border)" }}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {loading || !data ? (
        <p className="text-sm" style={{ color: "var(--color-jda-text-muted)" }}>Loading analytics…</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total MCP calls" value={data.adoption.total_calls} />
            <StatCard label="Active MCP users" value={data.adoption.active_mcp_users} />
            <StatCard label="MCP-enabled users" value={data.adoption.total_mcp_enabled} />
            <StatCard label="Total users" value={data.adoption.total_users} />
          </div>

          <div className="grid grid-cols-2 gap-5 mb-6">
            {/* Tool usage */}
            <Panel title="Tool usage">
              {data.tool_usage.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No tool calls recorded.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {data.tool_usage.map((t) => (
                    <div key={t.tool_name} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <span className="text-xs font-mono" style={{ color: "var(--color-jda-cream)" }}>{t.tool_name}</span>
                      <span className="text-xs font-semibold" style={{ color: "#60a5fa" }}>{t.calls}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Practice usage */}
            <Panel title="Usage by practice">
              {data.practice_usage.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No practice-linked activity.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {data.practice_usage.map((p) => (
                    <div key={p.practice_name} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <span className="text-xs" style={{ color: "var(--color-jda-cream)" }}>{p.practice_name}</span>
                      <span className="text-xs font-semibold" style={{ color: "#4ade80" }}>{p.calls}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-2 gap-5 mb-6">
            {/* Top users */}
            <Panel title="Top users by MCP calls">
              {data.user_activity.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No user activity.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {data.user_activity.map((u) => (
                    <div key={u.user_id} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div>
                        <span className="text-xs font-medium" style={{ color: "var(--color-jda-cream)" }}>{u.name ?? u.email ?? u.user_id.slice(0, 8)}</span>
                        <span className="text-xs ml-2" style={{ color: "var(--color-jda-text-muted)" }}>{formatDate(u.last_call)}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: "#60a5fa" }}>{u.calls}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Content metrics */}
            <Panel title="Most-used content">
              {data.top_methodologies.length === 0 && data.top_brands.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No content usage tracked yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.top_methodologies.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Methodologies</p>
                      {data.top_methodologies.map((m) => (
                        <div key={m.slug} className="flex items-center justify-between py-1 px-2">
                          <span className="text-xs" style={{ color: "var(--color-jda-cream)" }}>{m.slug}</span>
                          <span className="text-xs font-semibold" style={{ color: "#fbbf24" }}>{m.calls}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {data.top_brands.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1 mt-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Brand packages</p>
                      {data.top_brands.map((b) => (
                        <div key={b.slug} className="flex items-center justify-between py-1 px-2">
                          <span className="text-xs" style={{ color: "var(--color-jda-cream)" }}>{b.slug}</span>
                          <span className="text-xs font-semibold" style={{ color: "#fbbf24" }}>{b.calls}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Panel>
          </div>

          {/* Recent activity feed */}
          <Panel title="Recent MCP activity">
            {data.recent_activity.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No recent activity.</p>
            ) : (
              <div className="flex flex-col gap-0.5 max-h-80 overflow-y-auto">
                {data.recent_activity.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded" style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    <span className="text-xs font-mono w-48 flex-shrink-0" style={{ color: "#60a5fa" }}>{r.tool_name}</span>
                    <span className="text-xs flex-1 truncate" style={{ color: "var(--color-jda-cream-muted)" }}>{r.user_name ?? "Unknown"}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--color-jda-text-muted)" }}>{formatDate(r.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "var(--color-jda-bg-card)", border: "1px solid var(--color-jda-border)" }}>
      <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-jda-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-display)" }}>{label}</p>
      <p className="text-2xl font-black" style={{ fontFamily: "var(--font-display)", color: "var(--color-jda-cream)" }}>{value.toLocaleString()}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] p-5" style={{ background: "var(--color-jda-bg-card)", border: "1px solid var(--color-jda-border)" }}>
      <p className="text-xs font-semibold mb-3" style={{ color: "var(--color-jda-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-display)" }}>{title}</p>
      {children}
    </div>
  );
}
