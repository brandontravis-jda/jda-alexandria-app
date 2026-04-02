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

const SCOPE_LABELS: Record<string, string> = {
  all: "All",
  own_practice: "Own Practice",
  none: "None",
};

const SCOPE_COLORS: Record<string, { bg: string; text: string }> = {
  all: { bg: "rgba(34,197,94,0.12)", text: "#4ade80" },
  own_practice: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  none: { bg: "rgba(255,255,255,0.06)", text: "var(--color-jda-text-muted)" },
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Add permission form state
  const [addAction, setAddAction] = useState("");
  const [addScope, setAddScope] = useState<"own_practice" | "all" | "none">("own_practice");
  const [addingFor, setAddingFor] = useState<string | null>(null);

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
    const res = await fetch("/api/roles");
    if (res.ok) {
      const data = await res.json();
      setRoles(data.roles ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadRoles(); }, []);

  async function addPermission(roleId: string) {
    if (!addAction.trim()) return;
    setSaving(roleId);
    const res = await fetch(`/api/roles/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add_permission: { action: addAction.trim(), scope: addScope } }),
    });
    if (res.ok) {
      const data = await res.json();
      setRoles((prev) => prev.map((r) => r.id === roleId ? { ...r, permissions: data.permissions } : r));
      setAddAction("");
      setAddingFor(null);
    }
    setSaving(null);
  }

  async function removePermission(roleId: string, permId: string) {
    setSaving(roleId);
    const res = await fetch(`/api/roles/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remove_permission_id: permId }),
    });
    if (res.ok) {
      const data = await res.json();
      setRoles((prev) => prev.map((r) => r.id === roleId ? { ...r, permissions: data.permissions } : r));
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
            const isAddingPerms = addingFor === role.id;

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
                    <div className="flex items-center gap-3">
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

                {/* Expanded permission list */}
                {isExpanded && (
                  <div
                    className="border-t px-5 pb-5"
                    style={{ borderColor: "var(--color-jda-border)" }}
                  >
                    <p className="text-xs font-semibold mt-4 mb-2" style={{ color: "var(--color-jda-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Permissions
                    </p>

                    {role.permissions.length === 0 ? (
                      <p className="text-xs mb-3" style={{ color: "var(--color-jda-text-muted)" }}>No permissions assigned yet.</p>
                    ) : (
                      <div className="flex flex-col gap-1 mb-4">
                        {role.permissions.map((p) => {
                          const scopeStyle = SCOPE_COLORS[p.scope] ?? SCOPE_COLORS.none;
                          return (
                            <div key={p.id} className="flex items-center justify-between py-1">
                              <span className="text-xs font-mono" style={{ color: "var(--color-jda-text)" }}>{p.action}</span>
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: scopeStyle.bg, color: scopeStyle.text }}
                                >
                                  {SCOPE_LABELS[p.scope] ?? p.scope}
                                </span>
                                <button
                                  onClick={() => removePermission(role.id, p.id)}
                                  style={{ background: "none", border: "none", color: "var(--color-jda-text-muted)", cursor: "pointer", fontSize: 14, lineHeight: 1, opacity: 0.6 }}
                                  title="Remove permission"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add permission */}
                    {isAddingPerms ? (
                      <div className="flex gap-2 flex-wrap items-center mt-2">
                        <input
                          autoFocus
                          value={addAction}
                          onChange={(e) => setAddAction(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") addPermission(role.id); if (e.key === "Escape") { setAddingFor(null); setAddAction(""); } }}
                          placeholder="action (e.g. methodology:read)"
                          className="text-xs px-2 py-1.5 rounded font-mono flex-1"
                          style={{ background: "var(--color-jda-bg)", border: "1px solid var(--color-jda-border)", color: "var(--color-jda-text)", outline: "none", minWidth: 220 }}
                        />
                        <select
                          value={addScope}
                          onChange={(e) => setAddScope(e.target.value as "own_practice" | "all" | "none")}
                          className="text-xs px-2 py-1.5 rounded"
                          style={{ background: "var(--color-jda-bg)", border: "1px solid var(--color-jda-border)", color: "var(--color-jda-text)", outline: "none" }}
                        >
                          <option value="own_practice">Own Practice</option>
                          <option value="all">All</option>
                          <option value="none">None</option>
                        </select>
                        <button
                          onClick={() => addPermission(role.id)}
                          disabled={!addAction.trim()}
                          className="text-xs px-3 py-1.5 rounded font-semibold"
                          style={{ background: "var(--color-jda-red)", color: "#fff", border: "none", cursor: "pointer", opacity: !addAction.trim() ? 0.5 : 1 }}
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setAddingFor(null); setAddAction(""); }}
                          className="text-xs px-2 py-1.5 rounded"
                          style={{ background: "transparent", border: "1px solid var(--color-jda-border)", color: "var(--color-jda-text-muted)", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          onClick={() => { setAddingFor(role.id); setAddAction(""); setAddScope("own_practice"); }}
                          className="text-xs px-3 py-1.5 rounded"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px dashed var(--color-jda-border)", color: "var(--color-jda-text-muted)", cursor: "pointer" }}
                        >
                          + Add permission
                        </button>
                        {!role.is_system && (
                          <button
                            onClick={() => setConfirmModal({ roleId: role.id, name: role.display_name })}
                            className="text-xs px-3 py-1.5 rounded"
                            style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "var(--color-jda-red)", cursor: "pointer" }}
                          >
                            Delete role
                          </button>
                        )}
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
        System roles cannot be deleted. Permissions use the format{" "}
        <span style={{ fontFamily: "monospace" }}>resource:operation</span>{" "}
        with scope <span style={{ fontFamily: "monospace" }}>own_practice</span>,{" "}
        <span style={{ fontFamily: "monospace" }}>all</span>, or{" "}
        <span style={{ fontFamily: "monospace" }}>none</span>.
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
