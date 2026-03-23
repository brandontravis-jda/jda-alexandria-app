"use client";

import { useEffect, useState } from "react";

interface User {
  id: number;
  object_id: string;
  email: string | null;
  name: string | null;
  tier: string;
  practice: string | null;
  created_at: string;
  last_seen_at: string | null;
}

const TIERS = ["practitioner", "practice_leader", "admin"] as const;

const TIER_LABELS: Record<string, string> = {
  practitioner: "Practitioner",
  practice_leader: "Practice Leader",
  admin: "Admin",
};

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  practitioner: { bg: "rgba(255,255,255,0.06)", text: "var(--color-jda-text-muted)" },
  practice_leader: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  admin: { bg: "rgba(239,68,68,0.15)", text: "var(--color-jda-red)" },
};

function formatDate(ts: string | null) {
  if (!ts) return "Never";
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [editingPractice, setEditingPractice] = useState<number | null>(null);
  const [practiceInput, setPracticeInput] = useState("");

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function updateTier(userId: number, tier: string) {
    setSaving(userId);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...data.user } : u));
    }
    setSaving(null);
  }

  async function savePractice(userId: number) {
    setSaving(userId);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practice: practiceInput.trim() || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...data.user } : u));
    }
    setSaving(null);
    setEditingPractice(null);
  }

  return (
    <div>
      <div className="mb-7">
        <h1
          className="text-3xl font-black leading-none"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
        >
          Users
        </h1>
        <p
          className="text-sm mt-1 font-normal"
          style={{ color: "var(--color-jda-warm-gray)", letterSpacing: "0.03em", fontFamily: "var(--font-body)" }}
        >
          Everyone who has connected to Alexandria via Claude. Manage permission tiers here.
        </p>
      </div>

      <div
        className="rounded-[10px] border overflow-hidden"
        style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
      >
        {/* Table header */}
        <div
          className="grid px-6 py-3 border-b text-xs font-semibold"
          style={{
            gridTemplateColumns: "1fr 180px 180px 120px",
            borderColor: "var(--color-jda-border)",
            color: "var(--color-jda-text-muted)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>User</span>
          <span>Practice</span>
          <span>Permission Tier</span>
          <span>Last seen</span>
        </div>

        {loading ? (
          <p className="px-6 py-5 text-sm" style={{ color: "var(--color-jda-text-muted)" }}>Loading…</p>
        ) : users.length === 0 ? (
          <p className="px-6 py-5 text-sm" style={{ color: "var(--color-jda-text-muted)" }}>
            No users have connected yet. Once a practitioner authenticates via Claude, they'll appear here.
          </p>
        ) : (
          users.map((user, i) => {
            const tierStyle = TIER_COLORS[user.tier] ?? TIER_COLORS.practitioner;
            const isSaving = saving === user.id;
            const isEditingPractice = editingPractice === user.id;

            return (
              <div
                key={user.id}
                className="grid items-center px-6 py-4 border-t"
                style={{
                  gridTemplateColumns: "1fr 180px 180px 120px",
                  borderColor: i === 0 ? "transparent" : "var(--color-jda-border)",
                  opacity: isSaving ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {/* Name + email */}
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-jda-cream)" }}>
                    {user.name ?? "Unknown"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-jda-text-muted)", fontFamily: "monospace" }}>
                    {user.email ?? user.object_id}
                  </p>
                </div>

                {/* Practice */}
                <div>
                  {isEditingPractice ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={practiceInput}
                        onChange={(e) => setPracticeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") savePractice(user.id);
                          if (e.key === "Escape") setEditingPractice(null);
                        }}
                        placeholder="e.g. Brand"
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          background: "var(--color-jda-bg)",
                          border: "1px solid var(--color-jda-border)",
                          color: "var(--color-jda-text)",
                          outline: "none",
                          width: 90,
                        }}
                      />
                      <button
                        onClick={() => savePractice(user.id)}
                        className="text-xs px-2 py-1 rounded font-semibold"
                        style={{ background: "var(--color-jda-red)", color: "#fff", border: "none", cursor: "pointer" }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingPractice(user.id);
                        setPracticeInput(user.practice ?? "");
                      }}
                      className="text-xs px-2 py-1 rounded text-left w-full"
                      style={{
                        background: "transparent",
                        border: "1px solid transparent",
                        color: user.practice ? "var(--color-jda-text)" : "var(--color-jda-text-muted)",
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-jda-border)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                    >
                      {user.practice ?? "—"}
                    </button>
                  )}
                </div>

                {/* Tier selector */}
                <div>
                  <select
                    value={user.tier}
                    disabled={isSaving}
                    onChange={(e) => updateTier(user.id, e.target.value)}
                    className="text-xs px-2 py-1.5 rounded font-semibold"
                    style={{
                      background: tierStyle.bg,
                      color: tierStyle.text,
                      border: "1px solid transparent",
                      cursor: "pointer",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.04em",
                      outline: "none",
                      appearance: "auto",
                    }}
                  >
                    {TIERS.map((t) => (
                      <option
                        key={t}
                        value={t}
                        style={{ background: "var(--color-jda-bg)", color: "var(--color-jda-text)" }}
                      >
                        {TIER_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Last seen */}
                <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
                  {formatDate(user.last_seen_at)}
                </p>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs mt-4" style={{ color: "var(--color-jda-text-muted)" }}>
        Tier changes take effect immediately on the next MCP request. Users are created automatically when they first authenticate via Claude.
      </p>
    </div>
  );
}
