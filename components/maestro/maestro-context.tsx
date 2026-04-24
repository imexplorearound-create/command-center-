"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { OPEN_MAESTRO_EVENT, useDashboardEvent } from "@/lib/dashboard-events";

interface MaestroContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  newConversation: () => void;
}

const MaestroCtx = createContext<MaestroContextValue | null>(null);

// Re-export para compatibilidade — canonical é `@/lib/dashboard-events`.
export { OPEN_MAESTRO_EVENT };

export function MaestroProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const newConversation = useCallback(() => setConversationId(null), []);

  // `useDashboardEvent` usa AbortController no cleanup — previne listeners
  // duplos caso o provider re-mounte (logout/login, mudanças de sub-tree).
  useDashboardEvent(OPEN_MAESTRO_EVENT, () => setOpen(true));

  return (
    <MaestroCtx.Provider
      value={{ open, toggle, close, conversationId, setConversationId, newConversation }}
    >
      {children}
    </MaestroCtx.Provider>
  );
}

export function useMaestro() {
  const ctx = useContext(MaestroCtx);
  if (!ctx) throw new Error("useMaestro must be used within MaestroProvider");
  return ctx;
}
