"use client";

import { useEffect, useState } from "react";

interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
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

  useEffect(() => { loadKeys(); }, []);

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
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
    await loadKeys();
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
                  onClick={() => revokeKey(k.id)}
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
    </div>
  );
}
