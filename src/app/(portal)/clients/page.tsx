"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

interface BrandPackage {
  id: number;
  client_name: string;
  slug: string;
  abbreviations: string | null;
  source_document: string | null;
  extracted_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ClientsListPage() {
  const [rows, setRows] = useState<BrandPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
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
      const res = await fetch("/api/content/brand-packages");
      if (!res.ok) throw new Error("Failed to load brand packages");
      const data = await res.json();
      setRows(data.brand_packages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => rows.filter((b) => b.client_name.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

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

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/content/brand-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: newName.trim(), status: "draft" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Create failed");
      }
      setNewName("");
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
        <div className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>Loading clients…</div>
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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black leading-none" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
              Clients
            </h1>
            <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--color-jda-warm-gray)" }}>
              Brand packages Alexandria serves to Claude via MCP. {rows.length} client{rows.length === 1 ? "" : "s"} total.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="text-xs font-bold px-4 py-2 rounded-md transition-colors cursor-pointer"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-red)", color: "#fff" }}
            >
              + New client
            </button>
          )}
        </div>
      </div>

      {canEdit && showCreate && (
        <div className="rounded-[10px] p-6 border mb-5" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            New brand package
          </div>
          <div className="max-w-md">
            <label className="block text-xs mb-1 font-semibold" style={{ color: "var(--color-jda-warm-gray)" }}>Client name *</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-md border outline-none"
              style={{ background: "var(--color-jda-bg-surface)", borderColor: "var(--color-jda-border)", color: "var(--color-jda-cream)" }}
              placeholder="e.g. Acme Corp"
            />
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

      <div className="rounded-[10px] border overflow-hidden" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--color-jda-border)" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full text-sm px-3 py-2 rounded-md border outline-none"
            style={{ background: "var(--color-jda-bg-surface)", borderColor: "var(--color-jda-border)", color: "var(--color-jda-cream)" }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: "var(--color-jda-cream)" }}>
            <thead>
              <tr className="text-left" style={{ borderBottom: "1px solid var(--color-jda-border)" }}>
                <th className="px-4 py-3 text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Client</th>
                <th className="px-4 py-3 text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Abbreviations</th>
                <th className="px-4 py-3 text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Source</th>
                <th className="px-4 py-3 text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-jda-warm-gray)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
                    {search ? "No clients match your search." : "No brand packages found."}
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="content-row cursor-pointer transition-colors"
                    style={{ borderBottom: "1px solid var(--color-jda-border)" }}
                    onClick={() => window.location.href = `/clients/${b.id}`}
                  >
                    <td className="px-4 py-3 font-semibold">{b.client_name}</td>
                    <td className="px-4 py-3" style={{ color: "var(--color-jda-cream-muted)" }}>{b.abbreviations || "—"}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-jda-cream-muted)" }}>{b.source_document || "—"}</td>
                    <td className="px-4 py-3">{statusBadge(b.status)}</td>
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
