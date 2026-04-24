"use client";

import { useEffect, useRef } from "react";

// Canonical event names — único source of truth para pub/sub cross-component
// do Dashboard v1. Dispatcher (FeedPills, InlineActionButton, …) e listeners
// (DecisionsHighlighter, MaestroProvider, …) importam daqui.
export const HIGHLIGHT_DECISION_EVENT = "cc:highlight-decision";
export const FOCUS_DECISIONS_EVENT = "cc:focus-decisions";
export const OPEN_MAESTRO_EVENT = "cc:open-maestro";

// TS narrow o shape do `detail` consoante o nome do evento.
export type DashboardEventMap = {
  [HIGHLIGHT_DECISION_EVENT]: { decisionId: string };
  [FOCUS_DECISIONS_EVENT]: Record<string, never>;
  [OPEN_MAESTRO_EVENT]: { crewRoleSlug?: string | null };
};

export function dispatchDashboardEvent<K extends keyof DashboardEventMap>(
  type: K,
  detail?: DashboardEventMap[K],
): void {
  window.dispatchEvent(
    new CustomEvent(type, { detail: (detail ?? {}) as DashboardEventMap[K] }),
  );
}

// Hook para escutar um evento do dashboard. Usa `AbortController` no cleanup
// (mais robusto que `removeEventListener` manual — evita listeners duplos
// se o provider re-mountar) e `useRef` para o handler (evita re-registo em
// cada render quando o handler é inline).
export function useDashboardEvent<K extends keyof DashboardEventMap>(
  type: K,
  handler: (detail: DashboardEventMap[K]) => void,
): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  useEffect(() => {
    const controller = new AbortController();
    const listener = (e: Event) => {
      handlerRef.current((e as CustomEvent<DashboardEventMap[K]>).detail);
    };
    window.addEventListener(type, listener, { signal: controller.signal });
    return () => controller.abort();
  }, [type]);
}
