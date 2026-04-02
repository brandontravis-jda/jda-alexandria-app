"use client";

import { useEffect, useState } from "react";

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
  roles: Role[];
  user_permissions: UserPermission[];
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

type OverrideState = "grant" | "deny" | "inherit";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allActions, setAllActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [editingPractice, setEditingPractice] = useState<number | null>(null);
  const [practiceInput, setPracticeInput] = useState("");
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [permEditMode, setPermEditMode] = useState<number | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [transferTarget, setTransferTarget] = useState<number | null>(null);
  const [currentUserAccountType, setCurrentUserAccountType] = useState<string | null>(null);

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
      setAllRoles(data.allRoles ?? []);
      setAllActions(data.allActions ?? []);
      // Determine current user's account type from the session
      const me = (data.users ?? []).find((u: User) => u.portal_access);
      setCurrentUserAccountType(me?.account_type ?? null);
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

  async function savePractice(userId: number) {
    await patch(userId, { practice: practiceInput.trim() || null });
    setEditingPractice(null);
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

  async function togglePortalAccess(userId: number, current: boolean) {
    await patch(userId, { portal_access: !current });
  }

  async function setPermOverride(userId: number, action: string, state: OverrideState) {
    if (state === "inherit") {
      await patch(userId, { remove_permission_action: action });
    } else {
      await patch(userId, { add_permission: { action, type: state, scope: "all" } });
    }
  }

  async function transferOwnership(targetId: number) {
    if (!confirm("Transfer ownership to this user? You will become an Admin.")) return;
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
          Everyone who has authenticated to Alexandria. Assign roles and permission overrides to control what each practitioner can do.
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
            gridTemplateColumns: "1fr 140px 180px 80px 80px 100px",
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
          <span>Portal</span>
          <span>Last seen</span>
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
            const isEditingPractice = editingPractice === user.id;
            const isExpanded = expandedUser === user.id;
            const isPermEdit = permEditMode === user.id;
            const unassignedRoles = allRoles.filter((r) => !user.roles.some((ur) => ur.id === r.id));
            const portalBadge = ACCESS_BADGE[String(user.portal_access) as "true" | "false"];
            const acctBadge = ACCOUNT_TYPE_BADGE[user.account_type] ?? ACCOUNT_TYPE_BADGE.user;

            return (
              <div key={user.id}>
                <div
                  className="grid items-center px-6 py-4 border-t"
                  style={{
                    gridTemplateColumns: "1fr 140px 180px 80px 80px 100px",
                    borderColor: i === 0 ? "transparent" : "var(--color-jda-border)",
                    opacity: isSaving ? 0.6 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {/* Name + email */}
                  <div>
                    <button
                      onClick={async () => {
                        const next = isExpanded ? null : user.id;
                        setExpandedUser(next);
                        setPermEditMode(null);
                        if (next !== null) await loadRolePermissions(user);
                      }}
                      className="text-left"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <p className="text-sm font-medium" style={{ color: "var(--color-jda-cream)" }}>
                        {user.name ?? "Unknown"}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-jda-text-muted)", fontFamily: "monospace" }}>
                        {user.email ?? user.object_id}
                      </p>
                    </button>
                  </div>

                  {/* Account type badge */}
                  <div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: acctBadge.bg, color: acctBadge.text, fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}
                    >
                      {acctBadge.label}
                    </span>
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

                  {/* Practice */}
                  <div>
                    {isEditingPractice ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={practiceInput}
                          onChange={(e) => setPracticeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") savePractice(user.id);
                            if (e.key === "Escape") setEditingPractice(null);
                          }}
                          placeholder="Brand"
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            background: "var(--color-jda-bg)",
                            border: "1px solid var(--color-jda-border)",
                            color: "var(--color-jda-text)",
                            outline: "none",
                            width: 64,
                          }}
                        />
                        <button
                          onClick={() => savePractice(user.id)}
                          className="text-xs px-1.5 py-1 rounded font-semibold"
                          style={{ background: "var(--color-jda-red)", color: "#fff", border: "none", cursor: "pointer" }}
                        >
                          ✓
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
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-jda-border)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                      >
                        {user.practice ?? "—"}
                      </button>
                    )}
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

                {/* Expanded panel */}
                {isExpanded && (
                  <div
                    className="px-6 pb-5 border-t"
                    style={{ borderColor: "var(--color-jda-border)", background: "rgba(255,255,255,0.02)" }}
                  >
                    {/* Panel tabs */}
                    <div className="flex gap-4 pt-3 pb-3 border-b" style={{ borderColor: "var(--color-jda-border)" }}>
                      <button
                        onClick={() => setPermEditMode(null)}
                        className="text-xs font-semibold pb-1"
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: !isPermEdit ? "var(--color-jda-cream)" : "var(--color-jda-text-muted)",
                          borderBottom: !isPermEdit ? "2px solid var(--color-jda-accent)" : "2px solid transparent",
                          letterSpacing: "0.06em", textTransform: "uppercase",
                        }}
                      >
                        Roles &amp; Permissions
                      </button>
                      <button
                        onClick={() => setPermEditMode(user.id)}
                        className="text-xs font-semibold pb-1"
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: isPermEdit ? "var(--color-jda-cream)" : "var(--color-jda-text-muted)",
                          borderBottom: isPermEdit ? "2px solid var(--color-jda-accent)" : "2px solid transparent",
                          letterSpacing: "0.06em", textTransform: "uppercase",
                        }}
                      >
                        Edit Overrides
                      </button>
                      {currentUserAccountType === "owner" && user.account_type !== "owner" && (
                        <button
                          onClick={() => setTransferTarget(transferTarget === user.id ? null : user.id)}
                          className="text-xs font-semibold pb-1 ml-auto"
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "#fbbf24",
                            borderBottom: "2px solid transparent",
                            letterSpacing: "0.06em", textTransform: "uppercase",
                          }}
                        >
                          Transfer Ownership
                        </button>
                      )}
                    </div>

                    {/* Transfer ownership confirmation */}
                    {transferTarget === user.id && (
                      <div
                        className="mt-3 mb-2 p-3 rounded-lg"
                        style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}
                      >
                        <p className="text-sm font-semibold mb-2" style={{ color: "#fbbf24" }}>
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

                    {!isPermEdit ? (
                      /* ── VIEW MODE ── */
                      <div className="mt-3 space-y-4">
                        {/* Section 1: Role Permissions */}
                        <div>
                          <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            Role Permissions
                          </p>
                          {rolePermissions.length === 0 ? (
                            <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No permissions from assigned roles.</p>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {rolePermissions.map((rp) => {
                                const role = user.roles.find((r) => r.id === rp.role_id);
                                return (
                                  <div key={`${rp.role_id}-${rp.action}`} className="flex items-center gap-2">
                                    <span className="text-xs font-mono" style={{ color: "var(--color-jda-text)" }}>{rp.action}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)" }}>{rp.scope}</span>
                                    {role && <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>via {role.display_name}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Role assignment */}
                        <div>
                          <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            Assigned Roles
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

                        {/* Section 2: Granted overrides */}
                        {user.user_permissions.filter((p) => p.type === "grant").length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                              Granted Permissions
                            </p>
                            <div className="flex flex-col gap-1">
                              {user.user_permissions.filter((p) => p.type === "grant").map((p) => (
                                <div key={p.id} className="flex items-center gap-2">
                                  <span className="text-xs font-mono" style={{ color: "#60a5fa" }}>+ {p.action}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)" }}>{p.scope}</span>
                                  {p.granted_by_name && <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>by {p.granted_by_name}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Section 3: Denied overrides */}
                        {user.user_permissions.filter((p) => p.type === "deny").length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                              Denied Permissions
                            </p>
                            <div className="flex flex-col gap-1">
                              {user.user_permissions.filter((p) => p.type === "deny").map((p) => {
                                const roleGrant = getRoleGrantingAction(user, p.action);
                                return (
                                  <div key={p.id} className="flex items-center gap-2">
                                    <span className="text-xs font-mono" style={{ color: "#f87171" }}>− {p.action}</span>
                                    {roleGrant && <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>overrides {roleGrant}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* ── EDIT MODE: unified permission toggle list ── */
                      <div className="mt-3">
                        <p className="text-xs mb-3" style={{ color: "var(--color-jda-text-muted)" }}>
                          Set per-user overrides. <strong style={{ color: "var(--color-jda-text)" }}>Inherit</strong> = use whatever the role grants.
                        </p>
                        {allKnownActions.length === 0 ? (
                          <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>No permissions defined yet. Add permissions to roles first.</p>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {allKnownActions.map((action) => {
                              const state = getPermOverrideState(user, action);
                              const statusLabel = getPermStatusLabel(user, action);
                              const roleGrantingRole = getRoleGrantingAction(user, action);

                              return (
                                <div
                                  key={action}
                                  className="flex items-center gap-3 py-1.5 px-2 rounded"
                                  style={{ background: "rgba(255,255,255,0.02)" }}
                                >
                                  <span className="text-xs font-mono flex-1" style={{ color: "var(--color-jda-text)" }}>{action}</span>
                                  {statusLabel && (
                                    <span className="text-xs" style={{ color: statusLabel.color }}>{statusLabel.text}</span>
                                  )}
                                  {!statusLabel && roleGrantingRole && (
                                    <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>via {roleGrantingRole}</span>
                                  )}
                                  {/* Three-state toggle */}
                                  <div className="flex rounded overflow-hidden" style={{ border: "1px solid var(--color-jda-border)" }}>
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
                                              : "var(--color-jda-text)"
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
                            })}
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
    </div>
  );
}
