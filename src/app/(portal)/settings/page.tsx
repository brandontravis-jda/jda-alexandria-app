"use client";

import { useEffect, useState } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

interface Role {
  id: string;
  slug: string;
  display_name: string;
}

interface OrgConfig {
  default_role_id: string | null;
  default_role_name: string | null;
}

const RAW_MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "your-mcp-service.up.railway.app/mcp";
const MCP_URL = RAW_MCP_URL.startsWith("http") ? RAW_MCP_URL : `https://${RAW_MCP_URL}`;

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [orgConfig, setOrgConfig] = useState<OrgConfig>({ default_role_id: null, default_role_name: null });
  const [savingOrgConfig, setSavingOrgConfig] = useState(false);
  const [revokeModal, setRevokeModal] = useState<ApiKey | null>(null);

  // Debug mode state
  interface DebugRole { id: string; name: string; slug: string | null }
  const [isOwner, setIsOwner] = useState(false);
  const [debugRole, setDebugRole] = useState<DebugRole | null>(null);
  const [debugRoleSelect, setDebugRoleSelect] = useState("");
  const [savingDebug, setSavingDebug] = useState(false);

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function loadKeys() {
    const res = await fetch("/api/keys");
    const data = await res.json();
    setKeys(data.keys ?? []);
    setLoading(false);
  }

  async function loadOrgConfig() {
    const [configRes, rolesRes] = await Promise.all([
      fetch("/api/org-config"),
      fetch("/api/roles"),
    ]);
    if (configRes.ok) {
      const data = await configRes.json();
      setOrgConfig(data.config ?? { default_role_id: null, default_role_name: null });
    }
    if (rolesRes.ok) {
      const data = await rolesRes.json();
      setAllRoles(data.roles ?? []);
    }
  }

  async function loadDebugState() {
    const [meRes, debugRes] = await Promise.all([
      fetch("/api/me"),
      fetch("/api/me/debug"),
    ]);
    if (meRes.ok) {
      const me = await meRes.json();
      setIsOwner(me.account_type === "owner");
    }
    if (debugRes.ok) {
      const data = await debugRes.json();
      setDebugRole(data.debug_role ?? null);
    }
  }

  async function activateDebug() {
    if (!debugRoleSelect) return;
    setSavingDebug(true);
    const res = await fetch("/api/me/debug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id: debugRoleSelect }),
    });
    if (res.ok) {
      const data = await res.json();
      setDebugRole(data.debug_role ?? null);
    }
    setSavingDebug(false);
  }

  async function exitDebug() {
    setSavingDebug(true);
    await fetch("/api/me/debug", { method: "DELETE" });
    setDebugRole(null);
    setDebugRoleSelect("");
    setSavingDebug(false);
  }

  useEffect(() => { loadKeys(); loadOrgConfig(); loadDebugState(); }, []);

  async function saveDefaultRole(roleId: string) {
    setSavingOrgConfig(true);
    const res = await fetch("/api/org-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_role_id: roleId }),
    });
    if (res.ok) {
      const data = await res.json();
      setOrgConfig(data.config);
    }
    setSavingOrgConfig(false);
  }

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    setRevealedKey(null);

    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create key");
    } else {
      setRevealedKey(data.key);
      setNewKeyName("");
      await loadKeys();
    }
    setCreating(false);
  }

  async function revokeKey(id: number) {
    await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
    await loadKeys();
    setRevokeModal(null);
  }

  function formatDate(ts: string | null) {
    if (!ts) return "Never";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-jda-text)", marginBottom: 4 }}>
        Settings
      </h1>
      <p style={{ color: "var(--color-jda-text-muted)", marginBottom: 32, fontSize: 14 }}>
        Manage API keys for connecting Claude to Alexandria via MCP.
      </p>

      {/* Debug Mode — owner only */}
      {isOwner && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-jda-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Debug Mode
          </h2>
          <div style={{
            background: debugRole ? "rgba(180,83,9,0.08)" : "var(--color-jda-surface)",
            border: `1px solid ${debugRole ? "rgba(251,191,36,0.3)" : "var(--color-jda-border)"}`,
            borderRadius: 8,
            padding: "16px 20px",
          }}>
            <p style={{ color: "var(--color-jda-text)", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              Impersonate a Role
            </p>
            <p style={{ color: "var(--color-jda-text-muted)", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              Temporarily assume a role&apos;s permissions for testing. Your owner bypass is suspended — Claude will see exactly the permissions that role has. Resets automatically on next login. Changes affect your active MCP sessions immediately.
            </p>

            {debugRole ? (
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(251,191,36,0.1)",
                  border: "1px solid rgba(251,191,36,0.3)",
                  borderRadius: 8,
                  padding: "8px 14px",
                }}>
                  <span style={{ fontSize: 13, color: "#fbbf24" }}>⚠ Active:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>{debugRole.name}</span>
                </div>
                <button
                  onClick={exitDebug}
                  disabled={savingDebug}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid var(--color-jda-border)",
                    borderRadius: 6,
                    color: "var(--color-jda-text)",
                    padding: "8px 16px",
                    fontSize: 13,
                    cursor: savingDebug ? "not-allowed" : "pointer",
                    opacity: savingDebug ? 0.5 : 1,
                  }}
                >
                  {savingDebug ? "Clearing…" : "Exit Debug Mode"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <select
                  value={debugRoleSelect}
                  onChange={(e) => setDebugRoleSelect(e.target.value)}
                  disabled={savingDebug}
                  style={{
                    background: "var(--color-jda-bg)",
                    border: "1px solid var(--color-jda-border)",
                    borderRadius: 6,
                    color: "var(--color-jda-text)",
                    padding: "8px 12px",
                    fontSize: 14,
                    outline: "none",
                    minWidth: 200,
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select a role to impersonate…</option>
                  {allRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.display_name}</option>
                  ))}
                </select>
                <button
                  onClick={activateDebug}
                  disabled={!debugRoleSelect || savingDebug}
                  style={{
                    background: "#b45309",
                    border: "none",
                    borderRadius: 6,
                    color: "#fef3c7",
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: !debugRoleSelect || savingDebug ? "not-allowed" : "pointer",
                    opacity: !debugRoleSelect || savingDebug ? 0.5 : 1,
                  }}
                >
                  {savingDebug ? "Activating…" : "Activate Debug Mode"}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Organization */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-jda-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Organization
        </h2>
        <div style={{ background: "var(--color-jda-surface)", border: "1px solid var(--color-jda-border)", borderRadius: 8, padding: "16px 20px" }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: "var(--color-jda-text)", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              Default Role for New Users
            </p>
            <p style={{ color: "var(--color-jda-text-muted)", fontSize: 13, marginBottom: 12 }}>
              New users receive this role when they first authenticate. Changing this setting only affects future sign-ins — existing assignments are not touched.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <select
                value={orgConfig.default_role_id ?? ""}
                onChange={(e) => saveDefaultRole(e.target.value)}
                disabled={savingOrgConfig || allRoles.length === 0}
                style={{
                  background: "var(--color-jda-bg)",
                  border: "1px solid var(--color-jda-border)",
                  borderRadius: 6,
                  color: "var(--color-jda-text)",
                  padding: "8px 12px",
                  fontSize: 14,
                  outline: "none",
                  minWidth: 200,
                  cursor: "pointer",
                  opacity: savingOrgConfig ? 0.5 : 1,
                }}
              >
                <option value="" disabled>Select a role…</option>
                {allRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.display_name}</option>
                ))}
              </select>
              {savingOrgConfig && (
                <span style={{ color: "var(--color-jda-text-muted)", fontSize: 13 }}>Saving…</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MCP Connection Info */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-jda-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          MCP Server
        </h2>
        <div style={{ background: "var(--color-jda-surface)", border: "1px solid var(--color-jda-border)", borderRadius: 8, padding: "16px 20px" }}>
          <p style={{ color: "var(--color-jda-text-muted)", fontSize: 13, marginBottom: 8 }}>
            Connect Claude to Alexandria using this URL and an API key below.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <code style={{ background: "var(--color-jda-bg)", color: "var(--color-jda-accent)", padding: "6px 12px", borderRadius: 6, fontSize: 13, fontFamily: "monospace", flex: 1 }}>
              {MCP_URL}?key=YOUR_KEY
            </code>
          </div>
          <p style={{ color: "var(--color-jda-text-muted)", fontSize: 12, marginTop: 10 }}>
            In Claude → Settings → Integrations → Add integration. Paste the URL above with your key appended.
          </p>
        </div>
      </section>

      {/* Create key */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-jda-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Create API Key
        </h2>
        <div style={{ background: "var(--color-jda-surface)", border: "1px solid var(--color-jda-border)", borderRadius: 8, padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <input
              type="text"
              placeholder="Key name (e.g. My Claude)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createKey(); }}
              style={{
                flex: 1,
                background: "var(--color-jda-bg)",
                border: "1px solid var(--color-jda-border)",
                borderRadius: 6,
                color: "var(--color-jda-text)",
                padding: "8px 12px",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              style={{
                background: "var(--color-jda-accent)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: creating ? "default" : "pointer",
                opacity: creating || !newKeyName.trim() ? 0.5 : 1,
              }}
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>

          {error && (
            <p style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>{error}</p>
          )}

          {revealedKey && (
            <div style={{ marginTop: 14, background: "var(--color-jda-bg)", borderRadius: 6, padding: "12px 16px", border: "1px solid var(--color-jda-accent)" }}>
              <p style={{ color: "var(--color-jda-accent)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                Copy this key now — it will not be shown again.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <code style={{ color: "var(--color-jda-text)", fontSize: 13, fontFamily: "monospace", wordBreak: "break-all", flex: 1 }}>
                  {revealedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(revealedKey)}
                  style={{
                    background: copied ? "var(--color-jda-accent)" : "var(--color-jda-surface)",
                    border: "1px solid var(--color-jda-border)",
                    borderRadius: 6,
                    color: copied ? "#fff" : "var(--color-jda-text-muted)",
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s",
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Existing keys */}
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-jda-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Active Keys
        </h2>
        <div style={{ background: "var(--color-jda-surface)", border: "1px solid var(--color-jda-border)", borderRadius: 8, overflow: "hidden" }}>
          {loading ? (
            <p style={{ color: "var(--color-jda-text-muted)", fontSize: 14, padding: "16px 20px" }}>Loading…</p>
          ) : keys.length === 0 ? (
            <p style={{ color: "var(--color-jda-text-muted)", fontSize: 14, padding: "16px 20px" }}>No API keys yet.</p>
          ) : (
            keys.map((k, i) => (
              <div
                key={k.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderTop: i > 0 ? "1px solid var(--color-jda-border)" : undefined,
                }}
              >
                <div>
                  <p style={{ color: "var(--color-jda-text)", fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
                    {k.name}
                  </p>
                  <p style={{ color: "var(--color-jda-text-muted)", fontSize: 12, fontFamily: "monospace" }}>
                    {k.key_prefix}… · Created {formatDate(k.created_at)} · Last used {formatDate(k.last_used_at)}
                  </p>
                </div>
                <button
                  onClick={() => setRevokeModal(k)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--color-jda-border)",
                    borderRadius: 6,
                    color: "var(--color-jda-text-muted)",
                    padding: "5px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </section>
      <ConfirmModal
        open={!!revokeModal}
        title="Revoke API key"
        message={`Revoke "${revokeModal?.name}"? Any connections using this key will stop working immediately. This cannot be undone.`}
        confirmLabel="Revoke"
        confirmDanger
        onConfirm={() => revokeModal && revokeKey(revokeModal.id)}
        onCancel={() => setRevokeModal(null)}
      />
    </div>
  );
}
