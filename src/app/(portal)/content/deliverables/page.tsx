"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useCallback } from "react";

interface Deliverable {
  id: number;
  name: string;
  slug: string;
  practice_id: number | null;
  practice_name: string | null;
  ai_classification: string | null;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Practice {
  id: number;
  name: string;
}

const inputStyle = {
  background: "var(--color-jda-bg-surface)",
  borderColor: "var(--color-jda-border)",
  color: "var(--color-jda-cream)",
};

export default function DeliverablesListPage() {
  const [rows, setRows] = useState<Deliverable[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPractice, setNewPractice] = useState<number | "">("");
  const [newClassification, setNewClassification] = useState("");
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        const tierLevel: Record<string, number> = { none: 0, viewer: 1, editor: 2, leadership: 3, admin: 4 };
        setCanEdit((tierLevel[d.portal_tier] ?? 0) >= 2);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const [dRes, pRes] = await Promise.all([
        fetch("/api/content/deliverables"),
        fetch("/api/practices"),
      ]);
      if (!dRes.ok) throw new Error("Failed to load deliverables");
      const dData = await dRes.json();
      setRows(dData.deliverables ?? []);
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
    () => rows.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())),
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
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: c.bg, color: c.text }}>
        {s}
      </span>
    );
  };

  function startEdit(d: Deliverable) {
    setEditingId(d.id);
    setEditForm({
      name: d.name,
      practice_id: d.practice_id ?? "",
      ai_classification: d.ai_classification ?? "",
      description: d.description ?? "",
      status: d.status,
    });
  }

  async function saveEdit() {
    if (editingId === null) return;
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        practice_id: editForm.practice_id || null,
        ai_classification: editForm.ai_classification || null,
      };
      const res = await fetch(`/api/content/deliverables/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      setEditingId(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/content/deliverables/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/content/deliverables", {
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
        <div className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>Loading deliverables…</div>
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
              Deliverable classifications
            </h1>
            <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--color-jda-warm-gray)" }}>
              {rows.length} classification{rows.length === 1 ? "" : "s"} · taxonomy aligned to the{" "}
              <Link href="/capabilities" className="underline" style={{ color: "var(--color-jda-red)" }}>capabilities matrix</Link>.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="text-xs font-bold px-4 py-2 rounded-md transition-colors cursor-pointer"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-red)", color: "#fff" }}
            >
              + New classification
            </button>
          )}
        </div>
      </div>

      {canEdit && showCreate && (
        <div className="rounded-[10px] p-6 border mb-5" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            New deliverable classification
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--color-jda-warm-gray)" }}>Name *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full text-sm px-3 py-2 rounded-md border outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--color-jda-warm-gray)" }}>Practice</label>
              <select value={newPractice} onChange={(e) => setNewPractice(e.target.value ? Number(e.target.value) : "")} className="w-full text-sm px-3 py-2 rounded-md border outline-none" style={inputStyle}>
                <option value="">None</option>
                {practices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--color-jda-warm-gray)" }}>AI Classification</label>
              <select value={newClassification} onChange={(e) => setNewClassification(e.target.value)} className="w-full text-sm px-3 py-2 rounded-md border outline-none" style={inputStyle}>
                <option value="">Select…</option>
                <option value="ai_led">AI-led</option>
                <option value="ai_assisted">AI-assisted</option>
                <option value="human_led">Human-led</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={creating || !newName.trim()} className="text-xs font-bold px-4 py-2 rounded-md cursor-pointer disabled:opacity-50" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-red)", color: "#fff" }}>
              {creating ? "Creating…" : "Create"}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-xs font-bold px-4 py-2 rounded-md cursor-pointer" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-bg-surface)", color: "var(--color-jda-cream-muted)" }}>
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
            placeholder="Search classifications…"
            className="w-full text-sm px-3 py-2 rounded-md border outline-none"
            style={inputStyle}
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
                <th className="px-4 py-3 text-xs font-bold text-right" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
                    {search ? "No classifications match your search." : "No deliverable classifications found."}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  editingId === d.id ? (
                    <tr key={d.id} style={{ borderBottom: "1px solid var(--color-jda-border)", background: "var(--color-jda-bg-surface)" }}>
                      <td className="px-4 py-2">
                        <input value={editForm.name as string} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full text-sm px-2 py-1 rounded border outline-none" style={inputStyle} />
                      </td>
                      <td className="px-4 py-2">
                        <select value={(editForm.practice_id as string | number) ?? ""} onChange={(e) => setEditForm({ ...editForm, practice_id: e.target.value ? Number(e.target.value) : "" })} className="w-full text-sm px-2 py-1 rounded border outline-none" style={inputStyle}>
                          <option value="">None</option>
                          {practices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select value={(editForm.ai_classification as string) ?? ""} onChange={(e) => setEditForm({ ...editForm, ai_classification: e.target.value })} className="w-full text-sm px-2 py-1 rounded border outline-none" style={inputStyle}>
                          <option value="">—</option>
                          <option value="ai_led">AI-led</option>
                          <option value="ai_assisted">AI-assisted</option>
                          <option value="human_led">Human-led</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select value={(editForm.status as string) ?? "active"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full text-sm px-2 py-1 rounded border outline-none" style={inputStyle}>
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button onClick={saveEdit} disabled={saving} className="text-xs font-semibold mr-2 cursor-pointer" style={{ color: "var(--color-jda-green)" }}>
                          {saving ? "…" : "Save"}
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs font-semibold cursor-pointer" style={{ color: "var(--color-jda-warm-gray)" }}>
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={d.id} className="content-row transition-colors" style={{ borderBottom: "1px solid var(--color-jda-border)" }}>
                      <td className="px-4 py-3 font-semibold">{d.name}</td>
                      <td className="px-4 py-3" style={{ color: "var(--color-jda-cream-muted)" }}>{d.practice_name ?? "—"}</td>
                      <td className="px-4 py-3" style={{ color: "var(--color-jda-cream-muted)" }}>{classLabel(d.ai_classification)}</td>
                      <td className="px-4 py-3">{statusBadge(d.status)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {canEdit && (
                          <>
                            <button onClick={() => startEdit(d)} className="text-xs font-semibold mr-3 cursor-pointer" style={{ color: "var(--color-jda-blue)" }}>
                              Edit
                            </button>
                            <button onClick={() => deleteRow(d.id, d.name)} className="text-xs font-semibold cursor-pointer" style={{ color: "var(--color-jda-red)" }}>
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
