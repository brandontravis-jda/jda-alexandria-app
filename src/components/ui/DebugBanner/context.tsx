"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";

export interface DebugRole {
  id: string;
  name: string;
  slug: string | null;
}

interface DebugContextValue {
  debugRole: DebugRole | null;
  isOwner: boolean;
  activateDebug: (roleId: string) => Promise<void>;
  exitDebug: () => Promise<void>;
}

const DebugContext = createContext<DebugContextValue>({
  debugRole: null,
  isOwner: false,
  activateDebug: async () => {},
  exitDebug: async () => {},
});

export function useDebug() {
  return useContext(DebugContext);
}

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [debugRole, setDebugRole] = useState<DebugRole | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const fetchDebugState = useCallback(async () => {
    try {
      const res = await fetch("/api/me/debug");
      if (!res.ok) {
        setDebugRole(null);
        return;
      }
      const data = await res.json();
      setDebugRole(data.debug_role ?? null);
    } catch {
      // Network error — leave current state
    }
  }, []);

  // Load ownership status once on mount
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((me) => { if (me) setIsOwner(me.account_type === "owner"); })
      .catch(() => {});
  }, []);

  // Poll every 3s — single source of truth for banner AND settings page
  useEffect(() => {
    fetchDebugState();
    const interval = setInterval(fetchDebugState, 3_000);
    return () => clearInterval(interval);
  }, [fetchDebugState]);

  const activateDebug = useCallback(async (roleId: string) => {
    const res = await fetch("/api/me/debug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id: roleId }),
    });
    if (res.ok) {
      const data = await res.json();
      setDebugRole(data.debug_role ?? null);
    }
  }, []);

  const exitDebug = useCallback(async () => {
    await fetch("/api/me/debug", { method: "DELETE" });
    setDebugRole(null);
  }, []);

  return (
    <DebugContext.Provider value={{ debugRole, isOwner, activateDebug, exitDebug }}>
      {children}
    </DebugContext.Provider>
  );
}
