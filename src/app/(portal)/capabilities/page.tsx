"use client";

import { useEffect, useState } from "react";

interface CapabilityRecord {
  _id: string;
  deliverableName: string;
  slug: string;
  practiceArea: string;
  status: "not_evaluated" | "classified" | "methodology_built" | "proven_status";
  aiClassification?: "ai_led" | "ai_assisted" | "human_led";
  baselineProductionTime?: string;
  aiNativeProductionTime?: string;
  linkedMethodology?: { name: string; slug: string };
  source?: string;
  notes?: string;
  ceilingLastReviewed?: string;
  liveSearchEnabled?: boolean;
}

interface Stats {
  total: number;
  not_evaluated: number;
  classified: number;
  methodology_built: number;
  proven_status: number;
  ai_led: number;
  ai_assisted: number;
  human_led: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  not_evaluated: { label: "Not Evaluated", color: "var(--color-jda-text-muted)", bg: "rgba(255,255,255,0.04)", icon: "○" },
  classified:    { label: "Classified",    color: "#f59e0b",                     bg: "rgba(245,158,11,0.12)", icon: "◐" },
  methodology_built: { label: "Methodology Built", color: "#60a5fa", bg: "rgba(59,130,246,0.12)", icon: "●" },
  proven_status: { label: "Proven",        color: "#34d399",                     bg: "rgba(52,211,153,0.12)", icon: "✓" },
};

const CLASS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ai_led:      { label: "AI-Led",      color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  ai_assisted: { label: "AI-Assisted", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  human_led:   { label: "Human-Led",   color: "var(--color-jda-text-muted)", bg: "rgba(255,255,255,0.06)" },
};

const PRACTICE_AREAS = [
  "Brand Strategy", "Brand Identity", "Creative Campaign", "Creative Digital",
  "Strategic Communications", "Digital Experience", "Development",
  "Business Development", "Account Services", "Operations",
  "Copy and Content", "Email", "PR", "Paid Media",
  "Social and Community", "Video and Animation", "Photography and Imagery",
];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_evaluated;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg, fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ClassBadge({ classification }: { classification?: string }) {
  if (!classification) return <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>—</span>;
  const cfg = CLASS_CONFIG[classification] ?? CLASS_CONFIG.human_led;
  return (
    <span
      className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg, fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}
    >
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div
      className="rounded-[10px] border p-4"
      style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
    >
      <p className="text-3xl font-black leading-none" style={{ color: color ?? "var(--color-jda-cream)", fontFamily: "var(--font-display)" }}>
        {value}
      </p>
      <p className="text-xs mt-1 font-semibold uppercase tracking-wider" style={{ color: "var(--color-jda-text-muted)", fontFamily: "var(--font-display)" }}>
        {label}
      </p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--color-jda-text-muted)" }}>{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums w-8 text-right" style={{ color: "var(--color-jda-text-muted)" }}>{pct}%</span>
    </div>
  );
}

export default function CapabilitiesPage() {
  const [records, setRecords] = useState<CapabilityRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterPractice, setFilterPractice] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [expandedPractice, setExpandedPractice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterPractice) params.set("practice_area", filterPractice);
    if (filterClass) params.set("classification", filterClass);
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/capabilities?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data.records ?? []);
      setStats(data.stats ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterPractice, filterClass, filterStatus]);

  const filtered = search.trim()
    ? records.filter((r) => r.deliverableName.toLowerCase().includes(search.toLowerCase()) || r.practiceArea.toLowerCase().includes(search.toLowerCase()))
    : records;

  // Group by practice area
  const byPractice: Record<string, CapabilityRecord[]> = {};
  for (const r of filtered) {
    if (!byPractice[r.practiceArea]) byPractice[r.practiceArea] = [];
    byPractice[r.practiceArea].push(r);
  }

  const selectStyle: React.CSSProperties = {
    background: "var(--color-jda-bg)",
    border: "1px solid var(--color-jda-border)",
    color: "var(--color-jda-text)",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 12,
    fontFamily: "var(--font-display)",
    letterSpacing: "0.04em",
    outline: "none",
    cursor: "pointer",
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-black leading-none"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
        >
          Capabilities Matrix
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-jda-warm-gray)", fontFamily: "var(--font-body)" }}>
          Every deliverable type JDA produces, scored by AI role and tracked through the transformation lifecycle.
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Identified" value={stats.total} />
            <StatCard label="Methodology Built" value={stats.methodology_built} color="#60a5fa" />
            <StatCard label="Proven Status" value={stats.proven_status} color="#34d399" />
            <StatCard label="Not Evaluated" value={stats.not_evaluated} color="var(--color-jda-text-muted)" />
          </div>

          {/* Transformation progress */}
          <div
            className="rounded-[10px] border p-4"
            style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-jda-text-muted)", fontFamily: "var(--font-display)" }}>
              Transformation Progress
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="text-xs w-36" style={{ color: "var(--color-jda-text-muted)" }}>Classified</span>
                <ProgressBar value={stats.classified + stats.methodology_built + stats.proven_status} total={stats.total} color="#f59e0b" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs w-36" style={{ color: "var(--color-jda-text-muted)" }}>Methodology Built</span>
                <ProgressBar value={stats.methodology_built + stats.proven_status} total={stats.total} color="#60a5fa" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs w-36" style={{ color: "var(--color-jda-text-muted)" }}>Proven Status</span>
                <ProgressBar value={stats.proven_status} total={stats.total} color="#34d399" />
              </div>
            </div>

            {/* Classification breakdown */}
            <div className="flex gap-4 mt-4 pt-3" style={{ borderTop: "1px solid var(--color-jda-border)" }}>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#34d399" }} />
                <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>{stats.ai_led} AI-Led</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#f59e0b" }} />
                <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>{stats.ai_assisted} AI-Assisted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: "rgba(255,255,255,0.2)" }} />
                <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>{stats.human_led} Human-Led</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>{stats.not_evaluated} Not Classified</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          type="text"
          placeholder="Search deliverables…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm px-3 py-1.5 rounded"
          style={{
            ...selectStyle,
            width: 200,
            fontSize: 13,
          }}
        />
        <select value={filterPractice} onChange={(e) => setFilterPractice(e.target.value)} style={selectStyle}>
          <option value="">All Practice Areas</option>
          {PRACTICE_AREAS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} style={selectStyle}>
          <option value="">All Classifications</option>
          <option value="ai_led">AI-Led</option>
          <option value="ai_assisted">AI-Assisted</option>
          <option value="human_led">Human-Led</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">All Statuses</option>
          <option value="not_evaluated">Not Evaluated</option>
          <option value="classified">Classified</option>
          <option value="methodology_built">Methodology Built</option>
          <option value="proven_status">Proven Status</option>
        </select>
        {(filterPractice || filterClass || filterStatus || search) && (
          <button
            onClick={() => { setFilterPractice(""); setFilterClass(""); setFilterStatus(""); setSearch(""); }}
            className="text-xs px-2 py-1.5 rounded"
            style={{ color: "var(--color-jda-text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Records grouped by practice area */}
      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-jda-text-muted)" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-jda-text-muted)" }}>No records match your filters.</p>
      ) : (
        <div className="space-y-2">
          {Object.entries(byPractice).map(([area, items]) => {
            const isExpanded = expandedPractice === area || !!filterPractice || !!search;
            const areaProven = items.filter((r) => r.status === "proven_status").length;
            const areaBuilt = items.filter((r) => r.status === "methodology_built").length;

            return (
              <div
                key={area}
                className="rounded-[10px] border overflow-hidden"
                style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
              >
                {/* Practice area header — clickable to expand/collapse */}
                <button
                  onClick={() => setExpandedPractice(isExpanded && expandedPractice === area ? null : area)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                  style={{ background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold" style={{ color: "var(--color-jda-cream)", fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
                      {area}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
                      {items.length} deliverable{items.length !== 1 ? "s" : ""}
                    </span>
                    {areaProven > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ color: "#34d399", background: "rgba(52,211,153,0.12)", fontFamily: "var(--font-display)" }}>
                        {areaProven} proven
                      </span>
                    )}
                    {areaBuilt > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ color: "#60a5fa", background: "rgba(59,130,246,0.12)", fontFamily: "var(--font-display)" }}>
                        {areaBuilt} methodology built
                      </span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
                    {isExpanded && expandedPractice === area ? "▲" : "▼"}
                  </span>
                </button>

                {/* Deliverable rows */}
                {(isExpanded) && (
                  <div style={{ borderTop: "1px solid var(--color-jda-border)" }}>
                    {/* Column headers */}
                    <div
                      className="grid px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                      style={{
                        gridTemplateColumns: "1fr 140px 160px 160px",
                        color: "var(--color-jda-text-muted)",
                        fontFamily: "var(--font-display)",
                        borderBottom: "1px solid var(--color-jda-border)",
                      }}
                    >
                      <span>Deliverable</span>
                      <span>Classification</span>
                      <span>Status</span>
                      <span>Methodology</span>
                    </div>

                    {items.map((r, i) => (
                      <div
                        key={r._id}
                        className="grid items-center px-5 py-3"
                        style={{
                          gridTemplateColumns: "1fr 140px 160px 160px",
                          borderTop: i === 0 ? "none" : "1px solid var(--color-jda-border)",
                        }}
                      >
                        <div>
                          <p className="text-sm" style={{ color: "var(--color-jda-cream)" }}>
                            {r.deliverableName}
                          </p>
                          {(r.baselineProductionTime || r.aiNativeProductionTime) && (
                            <p className="text-xs mt-0.5" style={{ color: "var(--color-jda-text-muted)" }}>
                              {r.baselineProductionTime && `Legacy: ${r.baselineProductionTime}`}
                              {r.baselineProductionTime && r.aiNativeProductionTime && " → "}
                              {r.aiNativeProductionTime && `AI-native: ${r.aiNativeProductionTime}`}
                            </p>
                          )}
                        </div>
                        <div>
                          <ClassBadge classification={r.aiClassification} />
                        </div>
                        <div>
                          <StatusBadge status={r.status} />
                        </div>
                        <div>
                          {r.linkedMethodology ? (
                            <span className="text-xs" style={{ color: "#60a5fa" }}>
                              {r.linkedMethodology.name}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs mt-4" style={{ color: "var(--color-jda-text-muted)" }}>
        Records seed from Discovery Intensives and the initial KIRU deliverable inventory. To classify a record or link a methodology, open it in{" "}
        <a href="/studio" style={{ color: "#60a5fa" }}>Sanity Studio</a>.
      </p>
    </div>
  );
}
