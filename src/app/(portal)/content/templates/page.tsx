"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useCallback } from "react";

interface Template {
  id: number;
  title: string;
  slug: string;
  format_type: string | null;
  status: string;
  practice_names?: string[];
  created_at: string;
  updated_at: string;
}

interface Practice {
  id: number;
  name: string;
}

export default function TemplatesListPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newFormat, setNewFormat] = useState("");
  const [newStatus, setNewStatus] = useState("draft");

  const load = useCallback(async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        fetch("/api/content/templates"),
        fetch("/api/practices"),
      ]);
      if (!tRes.ok) throw new Error("Failed to load templates");
      const tData = await tRes.json();
      setRows(tData.templates ?? []);
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
    () => rows.filter((t) => t.title.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const formatLabel = (v: string | null) => {
    if (!v) return "—";
    const map: Record<string, string> = { "html-deliverable": "HTML deliverable", "word-document": "Word document", "html-email": "HTML email" };
    return map[v] ?? v;
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      active: { bg: "var(--color-jda-green-muted)", text: "var(--color-jda-green)" },
      draft: { bg: "var(--color-jda-amber-muted)", text: "var(--color-jda-amber)" },
      deprecated: { bg: "rgba(138,122,114,0.15)", text: "var(--color-jda-warm-gray)" },
    };
    const c = colors[s] ?? colors.draft;
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: c.bg, color: c.text }}>
        {s}
      </span>
    );
  };

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/content/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), format_type: newFormat || null, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Create failed");
      }
      setNewTitle("");
      setNewFormat("");
      setNewStatus("draft");
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
        <div className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>Loading templates…</div>
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
            <h1 className="text-3xl font-black leading-none" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
              Templates
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--color-jda-warm-gray)" }}>
              {rows.length} template{rows.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-xs font-bold px-4 py-2 rounded-md transition-colors cursor-pointer"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-red)", color: "#fff" }}
          >
            + New template
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="rounded-[10px] p-6 border mb-5" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            New template
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--color-jda-warm-gray)" }}>Title *</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={{ background: "var(--color-jda-bg-surface)", borderColor: "var(--color-jda-border)", color: "var(--color-jda-cream)" }}
                placeholder="e.g. Email Newsletter Template"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--color-jda-warm-gray)" }}>Format type</label>
              <select
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={{ background: "var(--color-jda-bg-surface)", borderColor: "var(--color-jda-border)", color: "var(--color-jda-cream)" }}
              >
                <option value="">Select…</option>
                <option value="html-deliverable">HTML deliverable</option>
                <option value="word-document">Word document</option>
                <option value="html-email">HTML email</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--color-jda-warm-gray)" }}>Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={{ background: "var(--color-jda-bg-surface)", borderColor: "var(--color-jda-border)", color: "var(--color-jda-cream)" }}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
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

      <div className="rounded-[10px] border overflow-hidden" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--color-jda-border)" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full text-sm px-3 py-2 rounded-md border outline-none"
            style={{ background: "var(--color-jda-bg-surface)", borderColor: "var(--color-jda-border)", color: "var(--color-jda-cream)" }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: "var(--color-jda-cream)" }}>
            <thead>
              <tr className="text-left" style={{ borderBottom: "1px solid var(--color-jda-border)" }}>
                <th className="px-4 py-3 text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Title</th>
                <th className="px-4 py-3 text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Format</th>
                <th className="px-4 py-3 text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Status</th>
                <th className="px-4 py-3 text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Practices</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
                    {search ? "No templates match your search." : "No templates found."}
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="content-row cursor-pointer transition-colors"
                    style={{ borderBottom: "1px solid var(--color-jda-border)" }}
                    onClick={() => window.location.href = `/content/templates/${t.id}`}
                  >
                    <td className="px-4 py-3 font-semibold">{t.title}</td>
                    <td className="px-4 py-3" style={{ color: "var(--color-jda-cream-muted)" }}>{formatLabel(t.format_type)}</td>
                    <td className="px-4 py-3">{statusBadge(t.status)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-jda-cream-muted)" }}>
                      {t.practice_names?.join(", ") || "—"}
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
