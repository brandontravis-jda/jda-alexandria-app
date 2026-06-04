"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Role {
  id: string;
  slug: string;
  display_name: string;
  is_system: boolean;
}

interface UserPermission {
  id: string;
  action: string;
  type: "grant" | "deny";
  scope: string;
  created_at: string;
  granted_by_name: string | null;
}

interface Practice {
  id: number;
  name: string;
  slug: string;
}

interface User {
  id: number;
  object_id: string;
  email: string | null;
  name: string | null;
  account_type: "owner" | "admin" | "user";
  practice: string | null;
  portal_tier: string;
  mcp_access: boolean;
  created_at: string;
  last_seen_at: string | null;
  last_mcp_seen_at: string | null;
  roles: Role[];
  user_permissions: UserPermission[];
  practices: Practice[];
}

interface RolePermission {
  role_id: string;
  action: string;
  scope: string;
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

const TIER_OPTIONS = ["none", "viewer", "editor", "leadership", "admin"] as const;
const TIER_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  admin:      { label: "Admin",      bg: "rgba(139,92,246,0.15)", text: "#a78bfa" },
  leadership: { label: "Leadership", bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  editor:     { label: "Editor",     bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
  viewer:     { label: "Viewer",     bg: "rgba(34,197,94,0.12)",  text: "#4ade80" },
  none:       { label: "None",       bg: "rgba(255,255,255,0.04)", text: "var(--color-jda-text-muted)" },
};

const ACCESS_BADGE = {
  true:  { label: "Yes", bg: "rgba(34,197,94,0.12)", text: "#4ade80" },
  false: { label: "No",  bg: "rgba(255,255,255,0.06)", text: "var(--color-jda-text-muted)" },
};

type SortKey = "name" | "email" | "portal_tier" | "last_mcp_seen_at";
type SortDir = "asc" | "desc";
const TIER_LEVEL: Record<string, number> = { none: 0, viewer: 1, editor: 2, leadership: 3, admin: 4 };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allPractices, setAllPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [transferTarget, setTransferTarget] = useState<number | null>(null);
  const [currentUserAccountType, setCurrentUserAccountType] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [revokeResult, setRevokeResult] = useState<Record<number, string>>({});
  const [lastAdSync, setLastAdSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Search, sort, filter state
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [mcpFilter, setMcpFilter] = useState<boolean | null>(null);

  // Bulk select
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkTier, setBulkTier] = useState<string>("");

  const loadUsers = useCallback(async () => {
    const [usersRes, meRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/me"),
    ]);
    if (usersRes.ok) {
      const data = await usersRes.json();
      setUsers(data.users ?? []);
      setAllRoles(data.allRoles ?? []);
      setAllPractices(data.allPractices ?? []);
      setLastAdSync(data.lastAdSync ?? null);
    }
    if (meRes.ok) {
      const me = await meRes.json();
      setCurrentUserAccountType(me.account_type ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Filtered + sorted users
  const filteredUsers = useMemo(() => {
    let list = users;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((u) =>
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      );
    }

    if (tierFilter) {
      list = list.filter((u) => u.portal_tier === tierFilter);
    }

    if (mcpFilter !== null) {
      list = list.filter((u) => u.mcp_access === mcpFilter);
    }

    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "name":
          return ((a.name ?? "").localeCompare(b.name ?? "")) * dir;
        case "email":
          return ((a.email ?? "").localeCompare(b.email ?? "")) * dir;
        case "portal_tier":
          return ((TIER_LEVEL[a.portal_tier] ?? 0) - (TIER_LEVEL[b.portal_tier] ?? 0)) * dir;
        case "last_mcp_seen_at": {
          const aT = a.last_mcp_seen_at ? new Date(a.last_mcp_seen_at).getTime() : 0;
          const bT = b.last_mcp_seen_at ? new Date(b.last_mcp_seen_at).getTime() : 0;
          return (aT - bT) * dir;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [users, search, tierFilter, mcpFilter, sortKey, sortDir]);

  async function loadRolePermissions(user: User) {
    if (user.roles.length === 0) { setRolePermissions([]); return; }
    const res = await fetch("/api/roles");
    if (!res.ok) return;
    const data = await res.json();
    const perms: RolePermission[] = [];
    for (const role of data.roles as { id: string; permissions: { action: string; scope: string }[] }[]) {
      if (user.roles.some((r) => r.id === role.id)) {
        for (const p of role.permissions) {
          perms.push({ role_id: role.id, action: p.action, scope: p.scope });
        }
      }
    }
    setRolePermissions(perms);
  }

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
    return res;
  }

  async function setPortalTier(userId: number, tier: string) {
    await patch(userId, { portal_tier: tier });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, portal_tier: tier } : u));
  }

  async function toggleMcpAccess(userId: number, current: boolean) {
    await patch(userId, { mcp_access: !current });
  }

  async function addPractice(userId: number, practiceId: number) {
    await patch(userId, { add_practice: practiceId });
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId) return u;
      const p = allPractices.find((ap) => ap.id === practiceId);
      if (!p || u.practices.some((up) => up.id === practiceId)) return u;
      return { ...u, practices: [...u.practices, p].sort((a, b) => a.name.localeCompare(b.name)) };
    }));
  }

  async function removePractice(userId: number, practiceId: number) {
    await patch(userId, { remove_practice: practiceId });
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId) return u;
      return { ...u, practices: u.practices.filter((p) => p.id !== practiceId) };
    }));
  }

  async function addRole(userId: number, roleId: string) {
    await patch(userId, { add_role: roleId });
    const updatedUser = users.find((u) => u.id === userId);
    if (updatedUser) await loadRolePermissions({ ...updatedUser });
  }

  async function removeRole(userId: number, roleId: string) {
    await patch(userId, { remove_role: roleId });
    const updatedUser = users.find((u) => u.id === userId);
    if (updatedUser) await loadRolePermissions({ ...updatedUser });
  }

  async function syncUsers() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/sync-users", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`Synced: ${data.created} new, ${data.updated} updated, ${data.disabled} disabled (${data.members_in_group} in AD group)`);
        setLastAdSync(data.synced_at);
        await loadUsers();
      } else {
        setSyncResult(`Error: ${data.detail ?? data.error ?? "Sync failed"}`);
      }
    } catch (e) {
      setSyncResult(`Error: ${e instanceof Error ? e.message : "Network request failed"}`);
    }
    setSyncing(false);
  }

  async function revokeMcpSessions(userId: number) {
    setSaving(userId);
    const res = await fetch(`/api/users/${userId}/sessions`, { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      setRevokeResult((prev) => ({ ...prev, [userId]: `${data.revoked} session(s) revoked` }));
    } else {
      setRevokeResult((prev) => ({ ...prev, [userId]: "Failed to revoke sessions" }));
    }
    setSaving(null);
  }

  async function deleteUser(userId: number) {
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    setDeleteTarget(null);
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (expandedUser === userId) setExpandedUser(null);
    } else {
      const data = await res.json();
      alert(data.error ?? "Delete failed");
    }
  }

  async function transferOwnership(targetId: number) {
    setSaving(targetId);
    const res = await fetch(`/api/users/${targetId}/transfer-ownership`, { method: "POST" });
    setSaving(null);
    if (res.ok) {
      setTransferTarget(null);
      await loadUsers();
    } else {
      const data = await res.json();
      alert(data.error ?? "Transfer failed");
    }
  }

  async function applyBulkTier() {
    if (!bulkTier || selected.size === 0) return;
    setSaving(-1);
    for (const userId of selected) {
      await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal_tier: bulkTier }),
      });
    }
    setSelected(new Set());
    setBulkTier("");
    setSaving(null);
    await loadUsers();
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleSelect(userId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filteredUsers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredUsers.map((u) => u.id)));
    }
  }

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black leading-none" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
            Users
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-jda-warm-gray)", fontFamily: "var(--font-body)" }}>
            Manage portal access, MCP permissions, and role assignments.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <button
            onClick={syncUsers}
            disabled={syncing}
            className="text-xs px-3 py-1.5 rounded-md font-semibold"
            style={{
              background: syncing ? "rgba(255,255,255,0.05)" : "rgba(59,130,246,0.15)",
              color: syncing ? "var(--color-jda-text-muted)" : "#60a5fa",
              border: `1px solid ${syncing ? "var(--color-jda-border)" : "rgba(59,130,246,0.3)"}`,
              cursor: syncing ? "wait" : "pointer",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.04em",
            }}
          >
            {syncing ? "Syncing…" : "Sync from AD"}
          </button>
          <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
            {lastAdSync ? `Last sync: ${formatDate(lastAdSync)}` : "Never synced"}
          </span>
          {syncResult && (
            <span className="text-xs max-w-[280px] text-right" style={{ color: syncResult.startsWith("Error") ? "#f87171" : "#4ade80" }}>
              {syncResult}
            </span>
          )}
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-md flex-1"
          style={{
            background: "var(--color-jda-card)",
            color: "var(--color-jda-cream)",
            border: "1px solid var(--color-jda-border)",
            maxWidth: 320,
          }}
        />

        <select
          value={tierFilter ?? ""}
          onChange={(e) => setTierFilter(e.target.value || null)}
          className="text-xs px-2 py-1.5 rounded-md"
          style={{ background: "var(--color-jda-card)", color: "var(--color-jda-cream)", border: "1px solid var(--color-jda-border)" }}
        >
          <option value="">All tiers</option>
          {TIER_OPTIONS.map((t) => (
            <option key={t} value={t}>{TIER_BADGE[t].label}</option>
          ))}
        </select>

        <select
          value={mcpFilter === null ? "" : String(mcpFilter)}
          onChange={(e) => setMcpFilter(e.target.value === "" ? null : e.target.value === "true")}
          className="text-xs px-2 py-1.5 rounded-md"
          style={{ background: "var(--color-jda-card)", color: "var(--color-jda-cream)", border: "1px solid var(--color-jda-border)" }}
        >
          <option value="">MCP: All</option>
          <option value="true">MCP: Enabled</option>
          <option value="false">MCP: Disabled</option>
        </select>

        <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
          {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <span className="text-xs font-semibold" style={{ color: "#60a5fa" }}>
            {selected.size} selected
          </span>
          <select
            value={bulkTier}
            onChange={(e) => setBulkTier(e.target.value)}
            className="text-xs px-2 py-1 rounded"
            style={{ background: "var(--color-jda-card)", color: "var(--color-jda-cream)", border: "1px solid var(--color-jda-border)" }}
          >
            <option value="">Set portal tier…</option>
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>{TIER_BADGE[t].label}</option>
            ))}
          </select>
          <button
            onClick={applyBulkTier}
            disabled={!bulkTier || saving === -1}
            className="text-xs px-3 py-1 rounded font-semibold"
            style={{
              background: bulkTier ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
              color: bulkTier ? "#60a5fa" : "var(--color-jda-text-muted)",
              border: "none",
              cursor: bulkTier ? "pointer" : "default",
            }}
          >
            {saving === -1 ? "Applying…" : "Apply"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs"
            style={{ background: "none", border: "none", color: "var(--color-jda-text-muted)", cursor: "pointer" }}
          >
            Clear
          </button>
        </div>
      )}

      {/* User table */}
      <div className="rounded-[10px] border overflow-hidden" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
        {/* Table header */}
        <div
          className="grid px-6 py-3 border-b text-xs font-semibold items-center"
          style={{
            gridTemplateColumns: "32px 1fr 120px 160px 100px 70px 100px",
            borderColor: "var(--color-jda-border)",
            color: "var(--color-jda-text-muted)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>
            <input
              type="checkbox"
              checked={filteredUsers.length > 0 && selected.size === filteredUsers.length}
              onChange={toggleSelectAll}
              style={{ accentColor: "#60a5fa" }}
            />
          </span>
          <span onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>User{sortArrow("name")}</span>
          <span onClick={() => toggleSort("portal_tier")} style={{ cursor: "pointer" }}>Portal tier{sortArrow("portal_tier")}</span>
          <span>Roles</span>
          <span>Practice</span>
          <span>MCP</span>
          <span onClick={() => toggleSort("last_mcp_seen_at")} style={{ cursor: "pointer" }}>Last MCP{sortArrow("last_mcp_seen_at")}</span>
        </div>

        {loading ? (
          <p className="px-6 py-5 text-sm" style={{ color: "var(--color-jda-text-muted)" }}>Loading…</p>
        ) : filteredUsers.length === 0 ? (
          <p className="px-6 py-5 text-sm" style={{ color: "var(--color-jda-text-muted)" }}>
            {search || tierFilter || mcpFilter !== null ? "No users match the current filters." : "No users found."}
          </p>
        ) : (
          filteredUsers.map((user, i) => {
            const isSaving = saving === user.id;
            const isExpanded = expandedUser === user.id;
            const unassignedRoles = allRoles.filter((r) => !user.roles.some((ur) => ur.id === r.id));
            const tierBadge = TIER_BADGE[user.portal_tier] ?? TIER_BADGE.none;
            const mcpBadge = ACCESS_BADGE[String(user.mcp_access) as "true" | "false"];

            return (
              <div key={user.id}>
                <div
                  className="grid items-center px-6 py-3.5 border-t cursor-pointer"
                  onClick={async (e) => {
                    if ((e.target as HTMLElement).closest("button, select, input, a")) return;
                    const next = isExpanded ? null : user.id;
                    setExpandedUser(next);
                    if (next !== null) await loadRolePermissions(user);
                  }}
                  style={{
                    gridTemplateColumns: "32px 1fr 120px 160px 100px 70px 100px",
                    borderColor: i === 0 ? "transparent" : "var(--color-jda-border)",
                    opacity: isSaving ? 0.6 : 1,
                    transition: "opacity 0.15s",
                    background: selected.has(user.id) ? "rgba(59,130,246,0.04)" : "transparent",
                  }}
                >
                  {/* Checkbox */}
                  <span>
                    <input
                      type="checkbox"
                      checked={selected.has(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      style={{ accentColor: "#60a5fa" }}
                    />
                  </span>

                  {/* Name + email */}
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--color-jda-cream)" }}>
                      {user.name ?? "Unknown"}
                      {user.account_type === "owner" && (
                        <span className="ml-1.5 text-xs font-semibold" style={{ color: "#fbbf24" }}>OWNER</span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-jda-text-muted)", fontFamily: "monospace" }}>
                      {user.email ?? user.object_id}
                    </p>
                  </div>

                  {/* Portal tier dropdown */}
                  <div>
                    {user.account_type === "owner" ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: TIER_BADGE.admin.bg, color: TIER_BADGE.admin.text, fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
                        Admin
                      </span>
                    ) : (
                      <select
                        value={user.portal_tier}
                        disabled={isSaving}
                        onChange={(e) => setPortalTier(user.id, e.target.value)}
                        style={{
                          background: tierBadge.bg,
                          color: tierBadge.text,
                          border: `1px solid ${tierBadge.text}40`,
                          borderRadius: 99,
                          padding: "2px 8px",
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "var(--font-display)",
                          letterSpacing: "0.04em",
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        {TIER_OPTIONS.map((t) => (
                          <option key={t} value={t}>{TIER_BADGE[t].label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Roles */}
                  <div className="flex flex-wrap gap-1 items-center">
                    {user.roles.length === 0 ? (
                      <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No roles</span>
                    ) : (
                      <>
                        {user.roles.slice(0, 1).map((r) => (
                          <span key={r.id} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}>
                            {r.display_name}
                          </span>
                        ))}
                        {user.roles.length > 1 && (
                          <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>+{user.roles.length - 1}</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Practices */}
                  <div className="flex flex-wrap gap-1 items-center">
                    {user.practices.length === 0 ? (
                      <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>—</span>
                    ) : (
                      <>
                        {user.practices.slice(0, 1).map((p) => (
                          <span key={p.id} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
                            {p.name}
                          </span>
                        ))}
                        {user.practices.length > 1 && (
                          <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>+{user.practices.length - 1}</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* MCP toggle */}
                  <div>
                    <button
                      onClick={() => toggleMcpAccess(user.id, user.mcp_access)}
                      disabled={isSaving}
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: mcpBadge.bg, color: mcpBadge.text, border: "none", cursor: "pointer", fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}
                    >
                      {mcpBadge.label}
                    </button>
                  </div>

                  {/* Last MCP use + chevron */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>{formatDate(user.last_mcp_seen_at)}</p>
                    <span style={{ color: "var(--color-jda-text-muted)", fontSize: 10, marginLeft: 8 }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="px-6 pb-6 border-t" style={{ borderColor: "var(--color-jda-border)", background: "rgba(255,255,255,0.02)" }}>
                    {/* Practices */}
                    <div className="mt-4 mb-4">
                      <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Practices</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {user.practices.length === 0 && <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>None assigned</span>}
                        {user.practices.map((p) => (
                          <span key={p.id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
                            {p.name}
                            <button onClick={() => removePractice(user.id, p.id)} style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", padding: 0, lineHeight: 1, opacity: 0.7 }} title="Remove">×</button>
                          </span>
                        ))}
                      </div>
                      {allPractices.filter((p) => !user.practices.some((up) => up.id === p.id)).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {allPractices.filter((p) => !user.practices.some((up) => up.id === p.id)).map((p) => (
                            <button key={p.id} onClick={() => addPractice(user.id, p.id)} className="text-xs px-2 py-1 rounded-full"
                              style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)", border: "1px dashed var(--color-jda-border)", cursor: "pointer" }}>
                              + {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
                      {/* Roles */}
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Roles (MCP permissions)</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {user.roles.length === 0 && <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>None assigned</span>}
                          {user.roles.map((r) => (
                            <span key={r.id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}>
                              {r.display_name}
                              <button onClick={() => removeRole(user.id, r.id)} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", padding: 0, lineHeight: 1, opacity: 0.7 }} title="Remove">×</button>
                            </span>
                          ))}
                        </div>
                        {unassignedRoles.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {unassignedRoles.map((r) => (
                              <button key={r.id} onClick={() => addRole(user.id, r.id)} className="text-xs px-2 py-1 rounded-full"
                                style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)", border: "1px dashed var(--color-jda-border)", cursor: "pointer" }}>
                                + {r.display_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Effective permissions (read-only) */}
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Effective MCP permissions</p>
                        <div className="flex flex-col gap-1">
                          {rolePermissions.length === 0 ? (
                            <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No permissions from assigned roles.</p>
                          ) : (
                            rolePermissions.map((rp) => {
                              const role = user.roles.find((r) => r.id === rp.role_id);
                              return (
                                <div key={`${rp.role_id}-${rp.action}`} className="flex items-center gap-2">
                                  <span className="text-xs font-mono" style={{ color: "var(--color-jda-text)" }}>{rp.action}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)" }}>{rp.scope}</span>
                                  {role && <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>via {role.display_name}</span>}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom actions */}
                    {user.account_type !== "owner" && (
                      <div className="mt-4 pt-4 border-t flex items-start justify-between" style={{ borderColor: "var(--color-jda-border)" }}>
                        <div className="flex items-center gap-4">
                          <button onClick={() => setDeleteTarget(user)} className="text-xs font-semibold"
                            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0 }}>
                            Delete user…
                          </button>
                          <button onClick={() => revokeMcpSessions(user.id)} disabled={saving === user.id} className="text-xs font-semibold"
                            style={{ background: "none", border: "none", color: "#fbbf24", cursor: "pointer", padding: 0 }}>
                            Revoke MCP sessions
                          </button>
                          {revokeResult[user.id] && (
                            <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>{revokeResult[user.id]}</span>
                          )}
                        </div>

                        {(currentUserAccountType as string) === "owner" && (
                          <div>
                            {transferTarget !== user.id ? (
                              <button onClick={() => setTransferTarget(user.id)} className="text-xs font-semibold"
                                style={{ background: "none", border: "none", color: "#fbbf24", cursor: "pointer", padding: 0 }}>
                                Transfer Ownership to this user…
                              </button>
                            ) : (
                              <div className="p-3 rounded-lg" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
                                <p className="text-sm font-semibold mb-1" style={{ color: "#fbbf24" }}>
                                  Transfer ownership to {user.name ?? user.email}?
                                </p>
                                <p className="text-xs mb-3" style={{ color: "var(--color-jda-text-muted)" }}>
                                  You will become an Admin. This cannot be undone without DB access.
                                </p>
                                <div className="flex gap-2">
                                  <button onClick={() => transferOwnership(user.id)} className="text-xs px-3 py-1.5 rounded font-semibold"
                                    style={{ background: "#fbbf24", color: "#000", border: "none", cursor: "pointer" }}>
                                    Confirm Transfer
                                  </button>
                                  <button onClick={() => setTransferTarget(null)} className="text-xs px-3 py-1.5 rounded"
                                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)", border: "1px solid var(--color-jda-border)", cursor: "pointer" }}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs mt-4" style={{ color: "var(--color-jda-text-muted)" }}>
        Portal tier changes take effect on the user&apos;s next page load. MCP role changes take effect on the next MCP request.
      </p>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete user"
        message={`Remove ${deleteTarget?.name ?? deleteTarget?.email ?? "this user"} from Alexandria? Their roles, permissions, and MCP sessions will be deleted.`}
        confirmLabel="Delete"
        confirmDanger
        onConfirm={() => deleteTarget && deleteUser(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
