"use client";

import { useEffect, useState, useMemo } from "react";

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

const PRACTICE_AREAS = [
  "Brand Creative",
  "Campaign and Production Creative",
  "Digital Marketing, Social, Email and Data",
  "Development",
  "Strategic Communications, PR and Crisis Comms",
  "Paid Media and Search",
  "Business Development",
  "Account Services",
  "Operations",
  "Logistics",
];

const PRACTICE_SHORT: Record<string, string> = {
  "Brand Creative": "Brand Creative",
  "Campaign and Production Creative": "Campaign",
  "Digital Marketing, Social, Email and Data": "Digital / Social / Email",
  "Development": "Development",
  "Strategic Communications, PR and Crisis Comms": "Comms / PR",
  "Paid Media and Search": "Paid Media",
  "Business Development": "Business Dev",
  "Account Services": "Account Services",
  "Operations": "Operations",
  "Logistics": "Logistics",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  not_evaluated:    { label: "Not Evaluated",     color: "var(--color-jda-text-muted)", bg: "rgba(255,255,255,0.04)", dot: "#555" },
  classified:       { label: "Classified",         color: "#f59e0b",                    bg: "rgba(245,158,11,0.15)",  dot: "#f59e0b" },
  methodology_built:{ label: "Methodology Built",  color: "#60a5fa",                    bg: "rgba(59,130,246,0.15)",  dot: "#60a5fa" },
  proven_status:    { label: "Proven",             color: "#34d399",                    bg: "rgba(52,211,153,0.15)",  dot: "#34d399" },
};

const CLASS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ai_led:      { label: "AI-Led",      color: "#34d399", bg: "rgba(52,211,153,0.15)" },
  ai_assisted: { label: "AI-Assisted", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  human_led:   { label: "Human-Led",   color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

type SortKey = "deliverableName" | "practiceArea" | "aiClassification" | "status";
type SortDir = "asc" | "desc";

function Pill({
  label, active, onClick, color,
}: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1 rounded-full font-semibold transition-all"
      style={{
        fontFamily: "var(--font-display)",
        letterSpacing: "0.04em",
        cursor: "pointer",
        border: active ? "none" : "1px solid var(--color-jda-border)",
        background: active ? (color ?? "var(--color-jda-red)") : "transparent",
        color: active ? "#fff" : "var(--color-jda-text-muted)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_evaluated;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg, fontFamily: "var(--font-display)", letterSpacing: "0.03em" }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function ClassBadge({ classification }: { classification?: string }) {
  if (!classification) return <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>—</span>;
  const cfg = CLASS_CONFIG[classification] ?? CLASS_CONFIG.human_led;
  return (
    <span
      className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg, fontFamily: "var(--font-display)", letterSpacing: "0.03em" }}
    >
      {cfg.label}
    </span>
  );
}

function SortHeader({
  label, sortKey, current, dir, onSort,
}: { label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void }) {
  const active = current === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-left"
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: active ? "var(--color-jda-cream)" : "var(--color-jda-text-muted)",
        fontFamily: "var(--font-display)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: 0,
      }}
    >
      {label}
      <span style={{ opacity: active ? 1 : 0.3, fontSize: 9 }}>{active ? (dir === "asc" ? " ▲" : " ▼") : " ▲"}</span>
    </button>
  );
}

function exportCSV(records: CapabilityRecord[]) {
  const cols = ["Deliverable", "Practice Area", "AI Classification", "Status", "Linked Methodology", "Baseline Time", "AI-Native Time", "Notes"];
  const rows = records.map((r) => [
    `"${r.deliverableName}"`,
    `"${r.practiceArea}"`,
    r.aiClassification ? CLASS_CONFIG[r.aiClassification]?.label ?? "" : "",
    STATUS_CONFIG[r.status]?.label ?? r.status,
    r.linkedMethodology?.name ?? "",
    r.baselineProductionTime ?? "",
    r.aiNativeProductionTime ?? "",
    `"${(r.notes ?? "").replace(/"/g, "'")}"`,
  ]);
  const csv = [cols.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jda-capabilities-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CapabilitiesPage() {
  const [records, setRecords] = useState<CapabilityRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Pill filter state
  const [activePractices, setActivePractices] = useState<Set<string>>(new Set());
  const [activeClasses, setActiveClasses] = useState<Set<string>>(new Set());
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());

  // Search + sort
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("practiceArea");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/capabilities");
    if (res.ok) {
      const data = await res.json();
      setRecords(data.records ?? []);
      setStats(data.stats ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function togglePractice(p: string) {
    setActivePractices((prev) => {
      const n = new Set(prev);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });
  }
  function toggleClass(c: string) {
    setActiveClasses((prev) => {
      const n = new Set(prev);
      n.has(c) ? n.delete(c) : n.add(c);
      return n;
    });
  }
  function toggleStatus(s: string) {
    setActiveStatuses((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }

  const filtered = useMemo(() => {
    let rows = records;
    if (activePractices.size > 0) rows = rows.filter((r) => activePractices.has(r.practiceArea));
    if (activeClasses.size > 0) rows = rows.filter((r) => r.aiClassification && activeClasses.has(r.aiClassification));
    if (activeStatuses.size > 0) rows = rows.filter((r) => activeStatuses.has(r.status));
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.deliverableName.toLowerCase().includes(q) || r.practiceArea.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => {
      const av = (a[sortKey] ?? "") as string;
      const bv = (b[sortKey] ?? "") as string;
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [records, activePractices, activeClasses, activeStatuses, search, sortKey, sortDir]);

  const hasFilters = activePractices.size > 0 || activeClasses.size > 0 || activeStatuses.size > 0 || search.trim();

  const selectStyle: React.CSSProperties = {
    background: "var(--color-jda-bg)",
    border: "1px solid var(--color-jda-border)",
    color: "var(--color-jda-text)",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 13,
    fontFamily: "var(--font-body)",
    outline: "none",
    cursor: "pointer",
    height: 32,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
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
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold"
          style={{
            background: "var(--color-jda-bg-card)",
            border: "1px solid var(--color-jda-border)",
            color: "var(--color-jda-text-muted)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.06em",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Stats strip */}
      {stats && (
        <div
          className="flex items-center gap-6 px-5 py-3 rounded-[10px] border mb-5 flex-wrap"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <div className="text-center">
            <p className="text-2xl font-black leading-none" style={{ fontFamily: "var(--font-display)", color: "var(--color-jda-cream)" }}>{stats.total}</p>
            <p className="text-xs mt-0.5 uppercase tracking-wider" style={{ color: "var(--color-jda-text-muted)", fontFamily: "var(--font-display)" }}>Total</p>
          </div>
          <div style={{ width: 1, height: 32, background: "var(--color-jda-border)" }} />
          {[
            { label: "Not Evaluated", val: stats.not_evaluated, color: "#555" },
            { label: "Classified", val: stats.classified, color: "#f59e0b" },
            { label: "Methodology Built", val: stats.methodology_built, color: "#60a5fa" },
            { label: "Proven", val: stats.proven_status, color: "#34d399" },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <div>
                <span className="text-sm font-bold" style={{ color: "var(--color-jda-cream)", fontFamily: "var(--font-display)" }}>{val}</span>
                <span className="text-xs ml-1.5" style={{ color: "var(--color-jda-text-muted)" }}>{label}</span>
              </div>
            </div>
          ))}
          <div style={{ width: 1, height: 32, background: "var(--color-jda-border)" }} />
          {[
            { label: "AI-Led", val: stats.ai_led, color: "#34d399" },
            { label: "AI-Assisted", val: stats.ai_assisted, color: "#f59e0b" },
            { label: "Human-Led", val: stats.human_led, color: "#94a3b8" },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <div>
                <span className="text-sm font-bold" style={{ color: "var(--color-jda-cream)", fontFamily: "var(--font-display)" }}>{val}</span>
                <span className="text-xs ml-1.5" style={{ color: "var(--color-jda-text-muted)" }}>{label}</span>
              </div>
            </div>
          ))}
          {/* Progress bar */}
          <div className="ml-auto flex items-center gap-3 min-w-[160px]">
            <div className="flex-1">
              <div className="flex rounded-full overflow-hidden h-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                {[
                  { val: stats.proven_status, color: "#34d399" },
                  { val: stats.methodology_built, color: "#60a5fa" },
                  { val: stats.classified, color: "#f59e0b" },
                ].map(({ val, color }) => (
                  <div key={color} style={{ width: `${(val / Math.max(stats.total, 1)) * 100}%`, background: color, transition: "width 0.4s" }} />
                ))}
              </div>
            </div>
            <span className="text-xs tabular-nums" style={{ color: "var(--color-jda-text-muted)", whiteSpace: "nowrap" }}>
              {stats.total > 0 ? Math.round(((stats.classified + stats.methodology_built + stats.proven_status) / stats.total) * 100) : 0}% classified
            </span>
          </div>
        </div>
      )}

      {/* Pill filters */}
      <div className="space-y-2.5 mb-4">
        {/* Practice area pills */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs uppercase tracking-wider mr-1 flex-shrink-0" style={{ color: "var(--color-jda-text-muted)", fontFamily: "var(--font-display)", fontSize: 10 }}>Practice</span>
          {PRACTICE_AREAS.map((p) => (
            <Pill key={p} label={PRACTICE_SHORT[p] ?? p} active={activePractices.has(p)} onClick={() => togglePractice(p)} />
          ))}
        </div>
        {/* Classification + status pills */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs uppercase tracking-wider mr-1 flex-shrink-0" style={{ color: "var(--color-jda-text-muted)", fontFamily: "var(--font-display)", fontSize: 10 }}>Class</span>
          <Pill label="AI-Led" active={activeClasses.has("ai_led")} onClick={() => toggleClass("ai_led")} color="#059669" />
          <Pill label="AI-Assisted" active={activeClasses.has("ai_assisted")} onClick={() => toggleClass("ai_assisted")} color="#b45309" />
          <Pill label="Human-Led" active={activeClasses.has("human_led")} onClick={() => toggleClass("human_led")} color="#475569" />
          <span className="text-xs uppercase tracking-wider mx-1 flex-shrink-0" style={{ color: "var(--color-jda-text-muted)", fontFamily: "var(--font-display)", fontSize: 10 }}>Status</span>
          <Pill label="Not Evaluated" active={activeStatuses.has("not_evaluated")} onClick={() => toggleStatus("not_evaluated")} color="#374151" />
          <Pill label="Classified" active={activeStatuses.has("classified")} onClick={() => toggleStatus("classified")} color="#b45309" />
          <Pill label="Methodology Built" active={activeStatuses.has("methodology_built")} onClick={() => toggleStatus("methodology_built")} color="#1d4ed8" />
          <Pill label="Proven" active={activeStatuses.has("proven_status")} onClick={() => toggleStatus("proven_status")} color="#047857" />
        </div>
      </div>

      {/* Search + count row */}
      <div className="flex items-center gap-3 mb-3">
        <input
          type="text"
          placeholder="Search deliverables…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...selectStyle, width: 240 }}
        />
        {hasFilters && (
          <button
            onClick={() => { setActivePractices(new Set()); setActiveClasses(new Set()); setActiveStatuses(new Set()); setSearch(""); }}
            className="text-xs px-3 py-1"
            style={{ background: "transparent", border: "none", color: "var(--color-jda-text-muted)", cursor: "pointer" }}
          >
            Clear all
          </button>
        )}
        <span className="ml-auto text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
          {filtered.length} of {records.length} records
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-[10px] border overflow-hidden"
        style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
      >
        {/* Column headers */}
        <div
          className="grid px-5 py-3 border-b"
          style={{
            gridTemplateColumns: "2.5fr 1.6fr 140px 160px 160px",
            borderColor: "var(--color-jda-border)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <SortHeader label="Deliverable" sortKey="deliverableName" current={sortKey} dir={sortDir} onSort={toggleSort} />
          <SortHeader label="Practice Area" sortKey="practiceArea" current={sortKey} dir={sortDir} onSort={toggleSort} />
          <SortHeader label="Classification" sortKey="aiClassification" current={sortKey} dir={sortDir} onSort={toggleSort} />
          <SortHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-jda-text-muted)", fontFamily: "var(--font-display)", fontSize: 11 }}>Methodology</span>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-sm text-center" style={{ color: "var(--color-jda-text-muted)" }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-center" style={{ color: "var(--color-jda-text-muted)" }}>No records match.</p>
        ) : (
          filtered.map((r, i) => (
            <div
              key={r._id}
              className="grid items-center px-5 py-3"
              style={{
                gridTemplateColumns: "2.5fr 1.6fr 140px 160px 160px",
                borderTop: i === 0 ? "none" : "1px solid var(--color-jda-border)",
              }}
            >
              <p className="text-sm pr-4" style={{ color: "var(--color-jda-cream)" }}>
                {r.deliverableName}
              </p>
              <p className="text-xs pr-4" style={{ color: "var(--color-jda-text-muted)" }}>
                {PRACTICE_SHORT[r.practiceArea] ?? r.practiceArea}
              </p>
              <div>
                <ClassBadge classification={r.aiClassification} />
              </div>
              <div>
                <StatusBadge status={r.status} />
              </div>
              <div>
                {r.linkedMethodology ? (
                  <span className="text-xs" style={{ color: "#60a5fa" }}>{r.linkedMethodology.name}</span>
                ) : (
                  <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs mt-3" style={{ color: "var(--color-jda-text-muted)" }}>
        Records seed from Discovery Intensives. To classify a record or link a methodology, open it in{" "}
        <a href="/studio" style={{ color: "#60a5fa" }}>Sanity Studio</a>.{" "}
        Export CSV to share with leadership.
      </p>
    </div>
  );
}
