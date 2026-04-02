"use client";

import { useEffect, useRef } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmDanger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button when modal opens; close on Escape
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          background: "var(--color-jda-bg-card)",
          border: "1px solid var(--color-jda-border)",
          borderRadius: 12,
          padding: "28px 32px",
          maxWidth: 420,
          width: "calc(100% - 48px)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
        }}
      >
        <h2
          id="confirm-modal-title"
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--color-jda-cream)",
            marginBottom: 10,
            fontFamily: "var(--font-display)",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--color-jda-text-muted)",
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "1px solid var(--color-jda-border)",
              borderRadius: 8,
              color: "var(--color-jda-text-muted)",
              padding: "8px 18px",
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            style={{
              background: confirmDanger ? "var(--color-jda-red)" : "var(--color-jda-accent)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              padding: "8px 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
