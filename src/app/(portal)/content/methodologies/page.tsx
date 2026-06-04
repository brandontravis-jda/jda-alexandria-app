"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useCallback } from "react";

interface Methodology {
  id: number;
  name: string;
  slug: string;
  description: string;
  practice_id: number | null;
  practice_name: string | null;
  ai_classification: string | null;
  proven_status: boolean;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Practice {
  id: number;
  name: string;
}

export default function MethodologiesListPage() {
  const [rows, setRows] = useState<Methodology[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPractice, setNewPractice] = useState<number | "">("");
  const [newClassification, setNewClassification] = useState("");

  const load = useCallback(async () => {
    try {
      const [mRes, pRes] = await Promise.all([
        fetch("/api/content/methodologies"),
        fetch("/api/practices"),
      ]);
      if (!mRes.ok) throw new Error("Failed to load methodologies");
      const mData = await mRes.json();
      setRows(mData.methodologies ?? []);
      if (pRes.ok) {
        const pData = await pRes.json();
        setPractices(pData.practices ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => rows.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const classLabel = (v: string | null) => {
    if (!v) return "—";
    const map: Record<string, string> = { ai_led: "AI-led", ai_assisted: "AI-assisted", human_led: "Human-led" };
    return map[v] ?? v;
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      active: { bg: "var(--color-jda-green-muted)", text: "var(--color-jda-green)" },
      draft: { bg: "var(--color-jda-amber-muted)", text: "var(--color-jda-amber)" },
      archived: { bg: "rgba(138,122,114,0.15)", text: "var(--color-jda-warm-gray)" },
    };
    const c = colors[s] ?? colors.draft;
    return (
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
        style={{ background: c.bg, color: c.text }}
      >
        {s}
      </span>
    );
  };

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/content/methodologies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          practice_id: newPractice || null,
          ai_classification: newClassification || null,
          status: "draft",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Create failed");
      }
      setNewName("");
      setNewPractice("");
      setNewClassification("");
      setShowCreate(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>Loading methodologies…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm" style={{ color: "var(--color-jda-red)" }}>{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <Link
          href="/content"
          className="text-xs font-semibold no-underline mb-2 inline-block"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em", color: "var(--color-jda-warm-gray)" }}
        >
          ← Content library
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-3xl font-black leading-none"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
            >
              Production methodologies
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--color-jda-warm-gray)" }}>
              {rows.length} methodology{rows.length === 1 ? "" : " records"}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-xs font-bold px-4 py-2 rounded-md transition-colors cursor-pointer"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "var(--color-jda-red)",
              color: "#fff",
            }}
          >
            + New methodology
          </button>
        </div>
      </div>

      {showCreate && (
        <div
          className="rounded-[10px] p-6 border mb-5"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            New methodology
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--color-jda-warm-gray)" }}>Name *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={{ background: "var(--color-jda-bg-surface)", borderColor: "var(--color-jda-border)", color: "var(--color-jda-cream)" }}
                placeholder="e.g. Landing Page Production"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--color-jda-warm-gray)" }}>Practice</label>
              <select
                value={newPractice}
                onChange={(e) => setNewPractice(e.target.value ? Number(e.target.value) : "")}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={{ background: "var(--color-jda-bg-surface)", borderColor: "var(--color-jda-border)", color: "var(--color-jda-cream)" }}
              >
                <option value="">Agency-wide</option>
                {practices.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--color-jda-warm-gray)" }}>AI Classification</label>
              <select
                value={newClassification}
                onChange={(e) => setNewClassification(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={{ background: "var(--color-jda-bg-surface)", borderColor: "var(--color-jda-border)", color: "var(--color-jda-cream)" }}
              >
                <option value="">Select…</option>
                <option value="ai_led">AI-led</option>
                <option value="ai_assisted">AI-assisted</option>
                <option value="human_led">Human-led</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="text-xs font-bold px-4 py-2 rounded-md cursor-pointer disabled:opacity-50"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-red)", color: "#fff" }}
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-xs font-bold px-4 py-2 rounded-md cursor-pointer"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-bg-surface)", color: "var(--color-jda-cream-muted)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        className="rounded-[10px] border overflow-hidden"
        style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--color-jda-border)" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search methodologies…"
            className="w-full text-sm px-3 py-2 rounded-md border outline-none"
            style={{ background: "var(--color-jda-bg-surface)", borderColor: "var(--color-jda-border)", color: "var(--color-jda-cream)" }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: "var(--color-jda-cream)" }}>
            <thead>
              <tr className="text-left" style={{ borderBottom: "1px solid var(--color-jda-border)" }}>
                <th className="px-4 py-3 text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Name</th>
                <th className="px-4 py-3 text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Practice</th>
                <th className="px-4 py-3 text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Classification</th>
                <th className="px-4 py-3 text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Status</th>
                <th className="px-4 py-3 text-xs font-bold text-center" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Ver</th>
                <th className="px-4 py-3 text-xs font-bold text-center" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Proven</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
                    {search ? "No methodologies match your search." : "No methodologies found."}
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="content-row cursor-pointer transition-colors"
                    style={{ borderBottom: "1px solid var(--color-jda-border)" }}
                    onClick={() => window.location.href = `/content/methodologies/${m.id}`}
                  >
                    <td className="px-4 py-3 font-semibold">{m.name}</td>
                    <td className="px-4 py-3" style={{ color: "var(--color-jda-cream-muted)" }}>{m.practice_name ?? "Agency-wide"}</td>
                    <td className="px-4 py-3" style={{ color: "var(--color-jda-cream-muted)" }}>{classLabel(m.ai_classification)}</td>
                    <td className="px-4 py-3">{statusBadge(m.status)}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--color-jda-cream-muted)" }}>v{m.version}</td>
                    <td className="px-4 py-3 text-center">
                      {m.proven_status ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--color-jda-green-muted)", color: "var(--color-jda-green)" }}>
                          Proven
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-jda-warm-gray)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
