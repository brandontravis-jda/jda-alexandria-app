"use client";

import { useEffect, useState } from "react";
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
  portal_access: boolean;
  mcp_access: boolean;
  created_at: string;
  last_seen_at: string | null;
  last_mcp_seen_at: string | null;
  roles: Role[];
  user_permissions: UserPermission[];
  practices: Practice[];
  portal_permissions: string[];
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

const ACCOUNT_TYPE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  owner:  { label: "Owner", bg: "rgba(251,191,36,0.15)", text: "#fbbf24" },
  admin:  { label: "Admin", bg: "rgba(139,92,246,0.15)", text: "#a78bfa" },
  user:   { label: "User",  bg: "rgba(255,255,255,0.06)", text: "var(--color-jda-text-muted)" },
};

const ACCESS_BADGE = {
  true:  { label: "Yes", bg: "rgba(34,197,94,0.12)", text: "#4ade80" },
  false: { label: "No",  bg: "rgba(255,255,255,0.06)", text: "var(--color-jda-text-muted)" },
};

const PORTAL_TIER_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  admin:       { label: "Admin",       bg: "rgba(139,92,246,0.15)", text: "#a78bfa" },
  performance: { label: "Performance", bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  content:     { label: "Content",     bg: "rgba(34,197,94,0.12)", text: "#4ade80" },
  access:      { label: "Access",      bg: "rgba(255,255,255,0.08)", text: "var(--color-jda-cream-muted)" },
  none:        { label: "None",        bg: "rgba(255,255,255,0.04)", text: "var(--color-jda-text-muted)" },
};

function getPortalTier(perms: string[]): string {
  if (perms.includes("portal:admin")) return "admin";
  if (perms.includes("portal:performance")) return "performance";
  if (perms.includes("portal:content")) return "content";
  if (perms.includes("portal:access")) return "access";
  return "none";
}

type OverrideState = "grant" | "deny" | "inherit";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allPractices, setAllPractices] = useState<Practice[]>([]);
  const [allActions, setAllActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [permEditMode, setPermEditMode] = useState<number | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [transferTarget, setTransferTarget] = useState<number | null>(null);
  const [currentUserAccountType, setCurrentUserAccountType] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [lastAdSync, setLastAdSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function loadUsers() {
    const [usersRes, meRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/me"),
    ]);
    if (usersRes.ok) {
      const data = await usersRes.json();
      setUsers(data.users ?? []);
      setAllRoles(data.allRoles ?? []);
      setAllPractices(data.allPractices ?? []);
      setAllActions(data.allActions ?? []);
      setLastAdSync(data.lastAdSync ?? null);
    }
    if (meRes.ok) {
      const me = await meRes.json();
      setCurrentUserAccountType(me.account_type ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  // Load role permissions for expanded user's roles (needed for permission status indicators)
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

  async function toggleMcpAccess(userId: number, current: boolean) {
    await patch(userId, { mcp_access: !current });
  }

  async function setPermOverride(userId: number, action: string, state: OverrideState) {
    if (state === "inherit") {
      await patch(userId, { remove_permission_action: action });
    } else {
      await patch(userId, { add_permission: { action, type: state, scope: "all" } });
    }
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

  function getPermOverrideState(user: User, action: string): OverrideState {
    const override = user.user_permissions.find((p) => p.action === action);
    if (!override) return "inherit";
    return override.type;
  }

  function getRoleGrantingAction(user: User, action: string): string | null {
    const rp = rolePermissions.find((p) => p.action === action);
    if (!rp) return null;
    const role = user.roles.find((r) => r.id === rp.role_id);
    return role?.display_name ?? null;
  }

  function getPermStatusLabel(user: User, action: string): { text: string; color: string } | null {
    const override = user.user_permissions.find((p) => p.action === action);
    const roleGrantingRole = getRoleGrantingAction(user, action);

    if (!override) {
      if (roleGrantingRole) return null; // normal active-via-role state
      return null; // normal not-granted state
    }

    if (override.type === "deny") {
      if (roleGrantingRole) return { text: `Denied — overrides ${roleGrantingRole}`, color: "#f87171" };
      return { text: "Denial has no effect — role doesn't grant this", color: "var(--color-jda-text-muted)" };
    }

    // grant
    if (roleGrantingRole) return { text: `Redundant — already granted by ${roleGrantingRole}`, color: "#fbbf24" };
    return { text: "Custom grant — not from any assigned role", color: "#60a5fa" };
  }

  // Compute the effective active permissions for a user (for view mode display)
  function getEffectivePermissions(user: User): string[] {
    const roleGranted = new Set(rolePermissions.filter((p) => p.scope !== "none").map((p) => p.action));
    const grants = user.user_permissions.filter((p) => p.type === "grant").map((p) => p.action);
    const denials = new Set(user.user_permissions.filter((p) => p.type === "deny").map((p) => p.action));
    const effective = new Set([...roleGranted, ...grants]);
    for (const d of denials) effective.delete(d);
    return [...effective].sort();
  }

  const allKnownActions = allActions.length > 0
    ? allActions
    : [...new Set(rolePermissions.map((p) => p.action))].sort();

  return (
    <div>
      <div className="mb-7 flex items-start justify-between">
        <div>
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
            Everyone in the Alexandria AD group. Assign roles and permission overrides to control what each practitioner can do.
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
            <span
              className="text-xs max-w-[280px] text-right"
              style={{ color: syncResult.startsWith("Error") ? "#f87171" : "#4ade80" }}
            >
              {syncResult}
            </span>
          )}
        </div>
      </div>

      <div
        className="rounded-[10px] border overflow-hidden"
        style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
      >
        {/* Table header */}
        <div
          className="grid px-6 py-3 border-b text-xs font-semibold"
          style={{
            gridTemplateColumns: "1fr 140px 180px 80px 100px 80px 100px",
            borderColor: "var(--color-jda-border)",
            color: "var(--color-jda-text-muted)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>User</span>
          <span>Account</span>
          <span>Roles</span>
          <span>Practice</span>
          <span>Portal tier</span>
          <span>MCP</span>
          <span>Last MCP use</span>
        </div>

        {loading ? (
          <p className="px-6 py-5 text-sm" style={{ color: "var(--color-jda-text-muted)" }}>Loading…</p>
        ) : users.length === 0 ? (
          <p className="px-6 py-5 text-sm" style={{ color: "var(--color-jda-text-muted)" }}>
            No users have connected yet. Once a practitioner authenticates via Claude, they&apos;ll appear here.
          </p>
        ) : (
          users.map((user, i) => {
            const isSaving = saving === user.id;
            const isExpanded = expandedUser === user.id;
            const isPermEdit = permEditMode === user.id;
            const unassignedRoles = allRoles.filter((r) => !user.roles.some((ur) => ur.id === r.id));
            const portalTier = getPortalTier(user.portal_permissions);
            const portalBadge = PORTAL_TIER_BADGE[portalTier];
            const mcpBadge = ACCESS_BADGE[String(user.mcp_access) as "true" | "false"];
            const acctBadge = ACCOUNT_TYPE_BADGE[user.account_type] ?? ACCOUNT_TYPE_BADGE.user;

            return (
              <div key={user.id}>
                <div
                  className="grid items-center px-6 py-4 border-t cursor-pointer"
                  onClick={async (e) => {
                    // Don't expand if clicking an interactive child (select, button, input)
                    if ((e.target as HTMLElement).closest("button, select, input, a")) return;
                    const next = isExpanded ? null : user.id;
                    setExpandedUser(next);
                    setPermEditMode(null);
                    if (next !== null) await loadRolePermissions(user);
                  }}
                  style={{
                    gridTemplateColumns: "1fr 140px 180px 80px 100px 80px 100px",
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

                  {/* Account type — dropdown for owner/admin acting on non-owner users */}
                  <div className="flex items-center gap-1.5">
                    {currentUserAccountType && ["owner", "admin"].includes(currentUserAccountType) && user.account_type !== "owner" ? (
                      <select
                        value={user.account_type}
                        disabled={isSaving}
                        onChange={(e) => patch(user.id, { account_type: e.target.value })}
                        title="Change account type"
                        style={{
                          background: acctBadge.bg,
                          color: acctBadge.text,
                          border: `1px solid ${acctBadge.text}40`,
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
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: acctBadge.bg, color: acctBadge.text, fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}
                      >
                        {acctBadge.label}
                      </span>
                    )}
                  </div>

                  {/* Roles */}
                  <div className="flex flex-wrap gap-1 items-center">
                    {user.roles.length === 0 ? (
                      <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No roles</span>
                    ) : (
                      user.roles.slice(0, 1).map((r) => (
                        <span
                          key={r.id}
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}
                        >
                          {r.display_name}
                        </span>
                      ))
                    )}
                    {user.roles.length > 1 && (
                      <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
                        +{user.roles.length - 1}
                      </span>
                    )}
                  </div>

                  {/* Practices */}
                  <div className="flex flex-wrap gap-1 items-center">
                    {user.practices.length === 0 ? (
                      <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>—</span>
                    ) : (
                      user.practices.slice(0, 1).map((p) => (
                        <span
                          key={p.id}
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}
                        >
                          {p.name}
                        </span>
                      ))
                    )}
                    {user.practices.length > 1 && (
                      <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
                        +{user.practices.length - 1}
                      </span>
                    )}
                  </div>

                  {/* Portal tier badge */}
                  <div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: portalBadge.bg,
                        color: portalBadge.text,
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {portalBadge.label}
                    </span>
                  </div>

                  {/* MCP access toggle */}
                  <div>
                    <button
                      onClick={() => toggleMcpAccess(user.id, user.mcp_access)}
                      disabled={isSaving}
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: mcpBadge.bg,
                        color: mcpBadge.text,
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {mcpBadge.label}
                    </button>
                  </div>

                  {/* Last MCP use + expand chevron */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
                      {formatDate(user.last_mcp_seen_at)}
                    </p>
                    <span style={{ color: "var(--color-jda-text-muted)", fontSize: 10, marginLeft: 8 }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div
                    className="px-6 pb-6 border-t"
                    style={{ borderColor: "var(--color-jda-border)", background: "rgba(255,255,255,0.02)" }}
                  >
                    {/* Practices */}
                    <div className="mt-4 mb-4">
                      <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Practices
                      </p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {user.practices.length === 0 && (
                          <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>None assigned</span>
                        )}
                        {user.practices.map((p) => (
                          <span
                            key={p.id}
                            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
                            style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}
                          >
                            {p.name}
                            <button
                              onClick={() => removePractice(user.id, p.id)}
                              style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", padding: 0, lineHeight: 1, opacity: 0.7 }}
                              title="Remove practice"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      {allPractices.filter((p) => !user.practices.some((up) => up.id === p.id)).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {allPractices.filter((p) => !user.practices.some((up) => up.id === p.id)).map((p) => (
                            <button
                              key={p.id}
                              onClick={() => addPractice(user.id, p.id)}
                              className="text-xs px-2 py-1 rounded-full"
                              style={{
                                background: "rgba(255,255,255,0.05)",
                                color: "var(--color-jda-text-muted)",
                                border: "1px dashed var(--color-jda-border)",
                                cursor: "pointer",
                              }}
                            >
                              + {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>

                      {/* LEFT: Roles */}
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          Roles
                        </p>
                        <div className="flex flex-wrap gap-2 mb-2">
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
                        )}
                      </div>

                      {/* RIGHT: Permissions */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            Permissions
                          </p>
                          <button
                            onClick={() => setPermEditMode(isPermEdit ? null : user.id)}
                            className="text-xs px-2 py-0.5 rounded font-semibold"
                            style={{
                              background: isPermEdit ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
                              border: "1px solid var(--color-jda-border)",
                              color: isPermEdit ? "var(--color-jda-cream)" : "var(--color-jda-text-muted)",
                              cursor: "pointer",
                            }}
                          >
                            {isPermEdit ? "Done" : "Edit"}
                          </button>
                        </div>

                        {!isPermEdit ? (
                          /* View mode */
                          <div className="flex flex-col gap-1">
                            {rolePermissions.length === 0 && user.user_permissions.length === 0 ? (
                              <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No permissions from assigned roles.</p>
                            ) : (
                              <>
                                {rolePermissions.map((rp) => {
                                  const role = user.roles.find((r) => r.id === rp.role_id);
                                  const denied = user.user_permissions.find((p) => p.action === rp.action && p.type === "deny");
                                  return (
                                    <div key={`${rp.role_id}-${rp.action}`} className="flex items-center gap-2">
                                      <span
                                        className="text-xs font-mono"
                                        style={{ color: denied ? "#f87171" : "var(--color-jda-text)", textDecoration: denied ? "line-through" : "none" }}
                                      >
                                        {rp.action}
                                      </span>
                                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)" }}>{rp.scope}</span>
                                      {role && !denied && <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>via {role.display_name}</span>}
                                      {denied && <span className="text-xs" style={{ color: "#f87171" }}>denied</span>}
                                    </div>
                                  );
                                })}
                                {user.user_permissions.filter((p) => p.type === "grant").map((p) => (
                                  <div key={p.id} className="flex items-center gap-2">
                                    <span className="text-xs font-mono" style={{ color: "#60a5fa" }}>+ {p.action}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)" }}>{p.scope}</span>
                                    <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>custom grant</span>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        ) : (
                          /* Edit mode — full toggle list */
                          <div className="flex flex-col gap-1">
                            {allKnownActions.length === 0 ? (
                              <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No permissions defined on any role yet.</p>
                            ) : (
                              allKnownActions.map((action) => {
                                const state = getPermOverrideState(user, action);
                                const roleGrantingRole = getRoleGrantingAction(user, action);
                                const statusLabel = getPermStatusLabel(user, action);

                                return (
                                  <div
                                    key={action}
                                    className="flex items-center gap-2 py-1 px-2 rounded"
                                    style={{ background: "rgba(255,255,255,0.02)" }}
                                  >
                                    <span className="text-xs font-mono flex-1" style={{ color: "var(--color-jda-text)" }}>{action}</span>
                                    {statusLabel ? (
                                      <span className="text-xs" style={{ color: statusLabel.color }}>{statusLabel.text}</span>
                                    ) : roleGrantingRole ? (
                                      <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>via {roleGrantingRole}</span>
                                    ) : null}
                                    <div className="flex rounded overflow-hidden" style={{ border: "1px solid var(--color-jda-border)", flexShrink: 0 }}>
                                      {(["grant", "inherit", "deny"] as OverrideState[]).map((opt) => (
                                        <button
                                          key={opt}
                                          onClick={() => setPermOverride(user.id, action, opt)}
                                          disabled={saving === user.id}
                                          className="text-xs px-2 py-0.5 font-semibold"
                                          style={{
                                            background: state === opt
                                              ? opt === "grant" ? "rgba(96,165,250,0.2)"
                                                : opt === "deny" ? "rgba(248,113,113,0.2)"
                                                : "rgba(255,255,255,0.1)"
                                              : "transparent",
                                            color: state === opt
                                              ? opt === "grant" ? "#60a5fa"
                                                : opt === "deny" ? "#f87171"
                                                : "var(--color-jda-cream)"
                                              : "var(--color-jda-text-muted)",
                                            border: "none",
                                            cursor: "pointer",
                                            textTransform: "capitalize",
                                            transition: "all 0.1s",
                                          }}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom actions — delete + transfer ownership */}
                    {currentUserAccountType && ["owner", "admin"].includes(currentUserAccountType) && user.account_type !== "owner" && (
                      <div className="mt-4 pt-4 border-t flex items-start justify-between" style={{ borderColor: "var(--color-jda-border)" }}>

                        {/* Delete user */}
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="text-xs font-semibold"
                          style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0 }}
                        >
                          Delete user…
                        </button>

                    {/* Transfer Ownership — owner only */}
                    {(currentUserAccountType as string) === "owner" && (
                      <div>
                        {transferTarget !== user.id ? (
                          <button
                            onClick={() => setTransferTarget(user.id)}
                            className="text-xs font-semibold"
                            style={{ background: "none", border: "none", color: "#fbbf24", cursor: "pointer", padding: 0 }}
                          >
                            Transfer Ownership to this user…
                          </button>
                        ) : (
                          <div
                            className="p-3 rounded-lg"
                            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}
                          >
                            <p className="text-sm font-semibold mb-1" style={{ color: "#fbbf24" }}>
                              Transfer ownership to {user.name ?? user.email}?
                            </p>
                            <p className="text-xs mb-3" style={{ color: "var(--color-jda-text-muted)" }}>
                              You will become an Admin. Exactly one Owner exists at all times. This cannot be undone without DB access.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => transferOwnership(user.id)}
                                className="text-xs px-3 py-1.5 rounded font-semibold"
                                style={{ background: "#fbbf24", color: "#000", border: "none", cursor: "pointer" }}
                              >
                                Confirm Transfer
                              </button>
                              <button
                                onClick={() => setTransferTarget(null)}
                                className="text-xs px-3 py-1.5 rounded"
                                style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)", border: "1px solid var(--color-jda-border)", cursor: "pointer" }}
                              >
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
        Role and permission changes take effect immediately on the next MCP request. Users are created when they first authenticate via Claude.
      </p>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete user"
        message={`Remove ${deleteTarget?.name ?? deleteTarget?.email ?? "this user"} from Alexandria? Their roles, permissions, and MCP sessions will be deleted. They can re-authenticate via Claude to create a new account.`}
        confirmLabel="Delete"
        confirmDanger
        onConfirm={() => deleteTarget && deleteUser(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
