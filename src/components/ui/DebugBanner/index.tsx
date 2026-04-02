"use client";

import { useState } from "react";
import { useDebug } from "./context";

export default function DebugBanner() {
  const { debugRole, exitDebug } = useDebug();
  const [clearing, setClearing] = useState(false);

  async function handleExit() {
    setClearing(true);
    await exitDebug();
    setClearing(false);
  }

  if (!debugRole) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        width: "100%",
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
        onClick={handleExit}
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
