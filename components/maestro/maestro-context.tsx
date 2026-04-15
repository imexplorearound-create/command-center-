"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface MaestroContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  newConversation: () => void;
}

const MaestroCtx = createContext<MaestroContextValue | null>(null);

export function MaestroProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const newConversation = useCallback(() => setConversationId(null), []);

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
