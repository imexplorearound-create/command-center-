"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

interface MaestroContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  newConversation: () => void;
}

const MaestroCtx = createContext<MaestroContextValue | null>(null);

// F3 Passo F: event global que abre o painel do Maestro a partir de
// qualquer ponto da UI (Crew column, Hero, etc.) sem ter de propagar o
// callback por todos os níveis. Pattern igual a `cc:highlight-decision`.
export const OPEN_MAESTRO_EVENT = "cc:open-maestro";

export function MaestroProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const newConversation = useCallback(() => setConversationId(null), []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_MAESTRO_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_MAESTRO_EVENT, onOpen);
  }, []);

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
