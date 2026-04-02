"use client";

import { useEffect, useState, useCallback } from "react";

interface DebugRole {
  id: string;
  name: string;
  slug: string;
}

export default function DebugBanner() {
  const [debugRole, setDebugRole] = useState<DebugRole | null>(null);
  const [clearing, setClearing] = useState(false);

  const fetchDebugState = useCallback(async () => {
    try {
      const res = await fetch("/api/me/debug");
      if (res.ok) {
        const data = await res.json();
        setDebugRole(data.debug_role ?? null);
      }
    } catch {
      // Silently ignore — banner is non-critical
    }
  }, []);

  useEffect(() => {
    fetchDebugState();
    // Poll every 30s so the banner disappears automatically if debug is exited via Claude
    const interval = setInterval(fetchDebugState, 30_000);
    return () => clearInterval(interval);
  }, [fetchDebugState]);

  async function exitDebug() {
    setClearing(true);
    try {
      await fetch("/api/me/debug", { method: "DELETE" });
      setDebugRole(null);
    } finally {
      setClearing(false);
    }
  }

  if (!debugRole) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#b45309",
        borderBottom: "2px solid #fbbf24",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        fontSize: "13px",
        fontFamily: "var(--font-display)",
        letterSpacing: "0.04em",
        color: "#fef3c7",
      }}
    >
      <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 11 }}>
        ⚠ Debug Mode
      </span>
      <span>
        MCP session is impersonating role <strong>{debugRole.name}</strong> — owner permissions suspended
      </span>
      <button
        onClick={exitDebug}
        disabled={clearing}
        style={{
          background: "rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 6,
          color: "#fef3c7",
          padding: "3px 12px",
          fontSize: 12,
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          cursor: clearing ? "not-allowed" : "pointer",
          opacity: clearing ? 0.6 : 1,
          letterSpacing: "0.04em",
        }}
      >
        {clearing ? "Clearing…" : "Exit Debug"}
      </button>
    </div>
  );
}
