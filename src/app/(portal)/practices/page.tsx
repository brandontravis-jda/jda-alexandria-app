"use client";

import { useEffect, useState } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Practice {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  member_count: number;
}

export default function PracticesPage() {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Practice | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPractices() {
    const res = await fetch("/api/practices");
    if (res.ok) {
      const data = await res.json();
      setPractices(data.practices ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadPractices(); }, []);

  async function handleCreate() {
    if (!createName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/practices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName.trim(), description: createDesc.trim() || undefined }),
    });
    if (res.ok) {
      setCreateName("");
      setCreateDesc("");
      setShowCreate(false);
      await loadPractices();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create practice");
    }
    setCreating(false);
  }

  async function handleUpdate(id: number) {
    if (!editName.trim()) return;
    setError(null);
    const res = await fetch(`/api/practices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || undefined }),
    });
    if (res.ok) {
      setEditingId(null);
      await loadPractices();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to update practice");
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    setDeleteTarget(null);
    const res = await fetch(`/api/practices/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadPractices();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to delete practice");
    }
  }

  return (
    <div>
      <div className="mb-7 flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-black leading-none"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
          >
            Practices
          </h1>
          <p
            className="text-sm mt-1 font-normal"
            style={{ color: "var(--color-jda-warm-gray)", letterSpacing: "0.03em", fontFamily: "var(--font-body)" }}
          >
            Manage practice areas. Users can belong to multiple practices, which control content scoping in Claude.
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError(null); }}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{
            background: "var(--color-jda-red)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.04em",
          }}
        >
          + New Practice
        </button>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}
        >
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div
          className="mb-6 p-5 rounded-[10px] border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <p
            className="text-xs font-semibold mb-3"
            style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            New Practice
          </p>
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Practice name (e.g. Brand Strategy)"
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                background: "var(--color-jda-bg)",
                border: "1px solid var(--color-jda-border)",
                color: "var(--color-jda-text)",
                outline: "none",
              }}
            />
            <input
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Description (optional)"
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                background: "var(--color-jda-bg)",
                border: "1px solid var(--color-jda-border)",
                color: "var(--color-jda-text)",
                outline: "none",
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !createName.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold"
                style={{
                  background: "var(--color-jda-red)",
                  color: "#fff",
                  border: "none",
                  cursor: creating ? "default" : "pointer",
                  opacity: creating || !createName.trim() ? 0.5 : 1,
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.04em",
                }}
              >
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => { setShowCreate(false); setCreateName(""); setCreateDesc(""); setError(null); }}
                className="px-4 py-2 rounded-lg text-xs font-semibold"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--color-jda-text-muted)",
                  border: "1px solid var(--color-jda-border)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Practices table */}
      <div
        className="rounded-[10px] border overflow-hidden"
        style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
      >
        <div
          className="grid px-6 py-3 border-b text-xs font-semibold"
          style={{
            gridTemplateColumns: "1fr 1fr 100px 120px",
            borderColor: "var(--color-jda-border)",
            color: "var(--color-jda-text-muted)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>Name</span>
          <span>Description</span>
          <span>Members</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <p className="px-6 py-5 text-sm" style={{ color: "var(--color-jda-text-muted)" }}>Loading…</p>
        ) : practices.length === 0 ? (
          <p className="px-6 py-5 text-sm" style={{ color: "var(--color-jda-text-muted)" }}>
            No practices defined yet. Create one to start assigning users.
          </p>
        ) : (
          practices.map((p, i) => {
            const isEditing = editingId === p.id;

            return (
              <div
                key={p.id}
                className="grid items-center px-6 py-4 border-t"
                style={{
                  gridTemplateColumns: "1fr 1fr 100px 120px",
                  borderColor: i === 0 ? "transparent" : "var(--color-jda-border)",
                }}
              >
                {isEditing ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(p.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="text-sm px-2 py-1 rounded mr-2"
                      style={{
                        background: "var(--color-jda-bg)",
                        border: "1px solid var(--color-jda-border)",
                        color: "var(--color-jda-text)",
                        outline: "none",
                      }}
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(p.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      placeholder="Description"
                      className="text-sm px-2 py-1 rounded mr-2"
                      style={{
                        background: "var(--color-jda-bg)",
                        border: "1px solid var(--color-jda-border)",
                        color: "var(--color-jda-text)",
                        outline: "none",
                      }}
                    />
                    <span className="text-sm" style={{ color: "var(--color-jda-text-muted)" }}>
                      {p.member_count}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(p.id)}
                        className="text-xs px-2 py-1 rounded font-semibold"
                        style={{ background: "var(--color-jda-red)", color: "#fff", border: "none", cursor: "pointer" }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)", border: "1px solid var(--color-jda-border)", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--color-jda-cream)" }}>
                        {p.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-jda-text-muted)", fontFamily: "monospace" }}>
                        {p.slug}
                      </p>
                    </div>
                    <p className="text-sm" style={{ color: p.description ? "var(--color-jda-cream-muted)" : "var(--color-jda-text-muted)" }}>
                      {p.description ?? "—"}
                    </p>
                    <span className="text-sm" style={{ color: "var(--color-jda-text-muted)" }}>
                      {p.member_count}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingId(p.id); setEditName(p.name); setEditDesc(p.description ?? ""); setError(null); }}
                        className="text-xs px-2 py-1 rounded font-semibold"
                        style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)", border: "1px solid var(--color-jda-border)", cursor: "pointer" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="text-xs px-2 py-1 rounded font-semibold"
                        style={{ background: "none", color: "#f87171", border: "none", cursor: "pointer", padding: "4px" }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete practice"
        message={`Remove "${deleteTarget?.name}"? This cannot be undone. Users assigned to this practice will be unassigned.`}
        confirmLabel="Delete"
        confirmDanger
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
