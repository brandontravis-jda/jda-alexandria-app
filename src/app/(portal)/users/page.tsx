"use client";

import { useEffect, useState } from "react";

interface Role {
  id: string;
  slug: string;
  display_name: string;
  is_system: boolean;
}

interface User {
  id: number;
  object_id: string;
  email: string | null;
  name: string | null;
  tier: string;
  practice: string | null;
  portal_access: boolean;
  mcp_access: boolean;
  created_at: string;
  last_seen_at: string | null;
  roles: Role[];
}

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

const ACCESS_BADGE = {
  true: { label: "Yes", bg: "rgba(34,197,94,0.12)", text: "#4ade80" },
  false: { label: "No", bg: "rgba(255,255,255,0.06)", text: "var(--color-jda-text-muted)" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [editingPractice, setEditingPractice] = useState<number | null>(null);
  const [practiceInput, setPracticeInput] = useState("");
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
      setAllRoles(data.allRoles ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function patch(userId: number, body: Record<string, unknown>) {
    setSaving(userId);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...data.user } : u));
    }
    setSaving(null);
  }

  async function savePractice(userId: number) {
    await patch(userId, { practice: practiceInput.trim() || null });
    setEditingPractice(null);
  }

  async function addRole(userId: number, roleId: string) {
    await patch(userId, { add_role: roleId });
  }

  async function removeRole(userId: number, roleId: string) {
    await patch(userId, { remove_role: roleId });
  }

  async function togglePortalAccess(userId: number, current: boolean) {
    await patch(userId, { portal_access: !current });
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
          Everyone who has connected to Alexandria via Claude. Assign roles to control what each practitioner can do.
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
            gridTemplateColumns: "1fr 160px 220px 80px 100px",
            borderColor: "var(--color-jda-border)",
            color: "var(--color-jda-text-muted)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>User</span>
          <span>Practice</span>
          <span>Roles</span>
          <span>Portal</span>
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
            const isSaving = saving === user.id;
            const isEditingPractice = editingPractice === user.id;
            const isExpanded = expandedUser === user.id;
            const unassignedRoles = allRoles.filter((r) => !user.roles.some((ur) => ur.id === r.id));
            const portalBadge = ACCESS_BADGE[String(user.portal_access) as "true" | "false"];

            return (
              <div key={user.id}>
                <div
                  className="grid items-center px-6 py-4 border-t"
                  style={{
                    gridTemplateColumns: "1fr 160px 220px 80px 100px",
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
                        onClick={() => { setEditingPractice(user.id); setPracticeInput(user.practice ?? ""); }}
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

                  {/* Roles */}
                  <div className="flex flex-wrap gap-1 items-center">
                    {user.roles.length === 0 ? (
                      <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No roles</span>
                    ) : (
                      user.roles.slice(0, 2).map((r) => (
                        <span
                          key={r.id}
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}
                        >
                          {r.display_name}
                        </span>
                      ))
                    )}
                    {user.roles.length > 2 && (
                      <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
                        +{user.roles.length - 2}
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "var(--color-jda-text-muted)",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>

                  {/* Portal access toggle */}
                  <div>
                    <button
                      onClick={() => togglePortalAccess(user.id, user.portal_access)}
                      disabled={isSaving}
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: portalBadge.bg,
                        color: portalBadge.text,
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {portalBadge.label}
                    </button>
                  </div>

                  {/* Last seen */}
                  <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
                    {formatDate(user.last_seen_at)}
                  </p>
                </div>

                {/* Expanded role management panel */}
                {isExpanded && (
                  <div
                    className="px-6 pb-4 border-t"
                    style={{ borderColor: "var(--color-jda-border)", background: "rgba(255,255,255,0.02)" }}
                  >
                    <p className="text-xs font-semibold mt-3 mb-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Assigned Roles
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {user.roles.length === 0 && (
                        <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>None assigned</span>
                      )}
                      {user.roles.map((r) => (
                        <span
                          key={r.id}
                          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
                          style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}
                        >
                          {r.display_name}
                          <button
                            onClick={() => removeRole(user.id, r.id)}
                            style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", padding: 0, lineHeight: 1, opacity: 0.7 }}
                            title="Remove role"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    {unassignedRoles.length > 0 && (
                      <>
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          Add Role
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {unassignedRoles.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => addRole(user.id, r.id)}
                              className="text-xs px-2 py-1 rounded-full"
                              style={{
                                background: "rgba(255,255,255,0.05)",
                                color: "var(--color-jda-text-muted)",
                                border: "1px dashed var(--color-jda-border)",
                                cursor: "pointer",
                              }}
                            >
                              + {r.display_name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs mt-4" style={{ color: "var(--color-jda-text-muted)" }}>
        Role changes take effect immediately on the next MCP request. Users are created automatically when they first authenticate via Claude.
        Portal access can be toggled independently of roles.
      </p>
    </div>
  );
}
