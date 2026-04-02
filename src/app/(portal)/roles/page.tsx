"use client";

import { useEffect, useState } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Permission {
  id: string;
  action: string;
  scope: string;
}

interface Role {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  user_count: number;
  permissions: Permission[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [allActions, setAllActions] = useState<string[]>([]);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Rename state
  const [renamingRole, setRenamingRole] = useState<string | null>(null);
  const [renameDisplay, setRenameDisplay] = useState("");
  const [renameDesc, setRenameDesc] = useState("");

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ roleId: string; name: string } | null>(null);

  // Create role form state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadRoles() {
    const [rolesRes, usersRes] = await Promise.all([
      fetch("/api/roles"),
      fetch("/api/users"),
    ]);
    if (rolesRes.ok) {
      const data = await rolesRes.json();
      setRoles(data.roles ?? []);
    }
    if (usersRes.ok) {
      const data = await usersRes.json();
      setAllActions(data.allActions ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadRoles(); }, []);

  async function setPermission(roleId: string, action: string, scope: "all" | "own_practice" | null) {
    setSaving(roleId);
    const role = roles.find((r) => r.id === roleId);
    const existing = role?.permissions.find((p) => p.action === action);

    if (scope === null) {
      // Remove — but only if it exists
      if (existing) {
        const res = await fetch(`/api/roles/${roleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remove_permission_id: existing.id }),
        });
        if (res.ok) {
          const data = await res.json();
          setRoles((prev) => prev.map((r) => r.id === roleId ? { ...r, permissions: data.permissions } : r));
        }
      }
    } else {
      // Add or update scope
      const res = await fetch(`/api/roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ add_permission: { action, scope } }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoles((prev) => prev.map((r) => r.id === roleId ? { ...r, permissions: data.permissions } : r));
      }
    }
    setSaving(null);
  }

  async function createRole() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: newName.trim(), description: newDesc.trim() || undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      setRoles((prev) => [...prev, data.role]);
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
    }
    setCreating(false);
  }

  async function renameRole(roleId: string) {
    if (!renameDisplay.trim()) return;
    setSaving(roleId);
    const res = await fetch(`/api/roles/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: renameDisplay.trim(), description: renameDesc.trim() || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setRoles((prev) => prev.map((r) =>
        r.id === roleId ? { ...r, ...data.role, permissions: data.permissions ?? r.permissions } : r
      ));
      setRenamingRole(null);
    }
    setSaving(null);
  }

  async function deleteRole(roleId: string) {
    const res = await fetch(`/api/roles/${roleId}`, { method: "DELETE" });
    if (res.ok) {
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      if (expandedRole === roleId) setExpandedRole(null);
    }
    setConfirmModal(null);
  }

  return (
    <div>
      <div className="mb-7 flex items-end justify-between">
        <div>
          <h1
            className="text-3xl font-black leading-none"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
          >
            Roles
          </h1>
          <p
            className="text-sm mt-1 font-normal"
            style={{ color: "var(--color-jda-warm-gray)", letterSpacing: "0.03em", fontFamily: "var(--font-body)" }}
          >
            Define what each role can do. Assign roles to users on the Users page.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-sm px-4 py-2 rounded-lg font-semibold"
          style={{ background: "var(--color-jda-red)", color: "#fff", border: "none", cursor: "pointer" }}
        >
          + New Role
        </button>
      </div>

      {/* Create role form */}
      {showCreate && (
        <div
          className="mb-6 p-5 rounded-[10px] border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--color-jda-cream)" }}>Create New Role</p>
          <div className="flex gap-3 flex-wrap">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Display name (e.g. Copywriter)"
              className="text-sm px-3 py-2 rounded-lg flex-1"
              style={{ background: "var(--color-jda-bg)", border: "1px solid var(--color-jda-border)", color: "var(--color-jda-text)", outline: "none", minWidth: 200 }}
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="text-sm px-3 py-2 rounded-lg flex-1"
              style={{ background: "var(--color-jda-bg)", border: "1px solid var(--color-jda-border)", color: "var(--color-jda-text)", outline: "none", minWidth: 200 }}
            />
            <button
              onClick={createRole}
              disabled={creating || !newName.trim()}
              className="text-sm px-4 py-2 rounded-lg font-semibold"
              style={{ background: "var(--color-jda-red)", color: "#fff", border: "none", cursor: "pointer", opacity: creating || !newName.trim() ? 0.5 : 1 }}
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-sm px-3 py-2 rounded-lg"
              style={{ background: "transparent", border: "1px solid var(--color-jda-border)", color: "var(--color-jda-text-muted)", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "var(--color-jda-text-muted)" }}>Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {roles.map((role) => {
            const isExpanded = expandedRole === role.id;
            const isSaving = saving === role.id;
            // All known actions — for the grid
            const gridActions = allActions.length > 0
              ? allActions
              : [...new Set(roles.flatMap((r) => r.permissions.map((p) => p.action)))].sort();

            return (
              <div
                key={role.id}
                className="rounded-[10px] border overflow-hidden"
                style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)", opacity: isSaving ? 0.7 : 1, transition: "opacity 0.15s" }}
              >
                {/* Role header row */}
                {renamingRole === role.id ? (
                  <div className="flex items-center gap-3 px-5 py-4">
                    <input
                      autoFocus
                      value={renameDisplay}
                      onChange={(e) => setRenameDisplay(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") renameRole(role.id); if (e.key === "Escape") setRenamingRole(null); }}
                      placeholder="Display name"
                      className="text-sm px-3 py-1.5 rounded-lg font-semibold"
                      style={{ background: "var(--color-jda-bg)", border: "1px solid var(--color-jda-border)", color: "var(--color-jda-cream)", outline: "none", minWidth: 180 }}
                    />
                    <input
                      value={renameDesc}
                      onChange={(e) => setRenameDesc(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") renameRole(role.id); if (e.key === "Escape") setRenamingRole(null); }}
                      placeholder="Description (optional)"
                      className="text-sm px-3 py-1.5 rounded-lg flex-1"
                      style={{ background: "var(--color-jda-bg)", border: "1px solid var(--color-jda-border)", color: "var(--color-jda-text)", outline: "none" }}
                    />
                    <button
                      onClick={() => renameRole(role.id)}
                      disabled={!renameDisplay.trim() || isSaving}
                      className="text-xs px-3 py-1.5 rounded font-semibold"
                      style={{ background: "var(--color-jda-red)", color: "#fff", border: "none", cursor: "pointer", opacity: !renameDisplay.trim() ? 0.5 : 1 }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setRenamingRole(null)}
                      className="text-xs px-3 py-1.5 rounded"
                      style={{ background: "transparent", border: "1px solid var(--color-jda-border)", color: "var(--color-jda-text-muted)", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer"
                    onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                          {role.display_name}
                        </span>
                        {role.is_system && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-jda-text-muted)", fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}
                          >
                            SYSTEM
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-jda-text-muted)" }}>{role.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
                        {role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""} · {role.user_count} user{role.user_count !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingRole(role.id);
                          setRenameDisplay(role.display_name);
                          setRenameDesc(role.description ?? "");
                          setExpandedRole(role.id);
                        }}
                        className="text-xs px-2 py-1 rounded"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--color-jda-border)", color: "var(--color-jda-text-muted)", cursor: "pointer" }}
                        title="Rename role"
                      >
                        Rename
                      </button>
                      <span style={{ color: "var(--color-jda-text-muted)", fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>
                )}

                {/* Expanded: permission grid */}
                {isExpanded && (
                  <div
                    className="border-t px-5 pb-5"
                    style={{ borderColor: "var(--color-jda-border)" }}
                  >
                    <p className="text-xs font-semibold mt-4 mb-3" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Permissions
                    </p>

                    {gridActions.length === 0 ? (
                      <p className="text-xs" style={{ color: "var(--color-jda-text-muted)" }}>
                        No permissions defined in the system yet. Create a permission on any role to populate this list.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {gridActions.map((action) => {
                          const existing = role.permissions.find((p) => p.action === action);
                          const currentScope = existing?.scope ?? null;

                          return (
                            <div
                              key={action}
                              className="flex items-center gap-3 py-1 px-2 rounded"
                              style={{ background: "rgba(255,255,255,0.02)" }}
                            >
                              <span className="text-xs font-mono flex-1" style={{ color: "var(--color-jda-text)" }}>{action}</span>
                              <div className="flex rounded overflow-hidden" style={{ border: "1px solid var(--color-jda-border)", flexShrink: 0 }}>
                                {(["all", "own_practice", null] as (string | null)[]).map((scope) => {
                                  const label = scope === "all" ? "All" : scope === "own_practice" ? "Own Practice" : "Off";
                                  const isActive = currentScope === scope;
                                  return (
                                    <button
                                      key={String(scope)}
                                      onClick={() => setPermission(role.id, action, scope as "all" | "own_practice" | null)}
                                      disabled={isSaving}
                                      className="text-xs px-2 py-0.5 font-semibold"
                                      style={{
                                        background: isActive
                                          ? scope === "all" ? "rgba(34,197,94,0.2)"
                                            : scope === "own_practice" ? "rgba(59,130,246,0.2)"
                                            : "rgba(255,255,255,0.1)"
                                          : "transparent",
                                        color: isActive
                                          ? scope === "all" ? "#4ade80"
                                            : scope === "own_practice" ? "#60a5fa"
                                            : "var(--color-jda-text-muted)"
                                          : "var(--color-jda-text-muted)",
                                        border: "none",
                                        cursor: isSaving ? "not-allowed" : "pointer",
                                        transition: "all 0.1s",
                                      }}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!role.is_system && (
                      <div className="mt-4">
                        <button
                          onClick={() => setConfirmModal({ roleId: role.id, name: role.display_name })}
                          className="text-xs px-3 py-1.5 rounded"
                          style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "var(--color-jda-red)", cursor: "pointer" }}
                        >
                          Delete role
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs mt-5" style={{ color: "var(--color-jda-text-muted)" }}>
        System roles cannot be deleted. Each permission can be granted for <strong>All</strong> data, <strong>Own Practice</strong> only, or turned <strong>Off</strong>.
      </p>

      <ConfirmModal
        open={!!confirmModal}
        title="Delete role"
        message={`Delete "${confirmModal?.name}"? This will remove it from all assigned users and cannot be undone.`}
        confirmLabel="Delete"
        confirmDanger
        onConfirm={() => confirmModal && deleteRole(confirmModal.roleId)}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}
