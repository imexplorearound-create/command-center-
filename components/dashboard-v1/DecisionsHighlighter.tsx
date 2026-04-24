"use client";

import { useEffect, useRef } from "react";
import {
  HIGHLIGHT_DECISION_EVENT,
  FOCUS_DECISIONS_EVENT,
  useDashboardEvent,
} from "@/lib/dashboard-events";

const HIGHLIGHT_MS = 1800;

export function DecisionsHighlighter() {
  const timeoutRef = useRef<number | null>(null);

  // Cleanup do timeout pendente quando o componente desmontar.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  useDashboardEvent(HIGHLIGHT_DECISION_EVENT, ({ decisionId }) => {
    const el = document.querySelector<HTMLElement>(`[data-decision-id="${decisionId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("is-highlighted");
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      el.classList.remove("is-highlighted");
      timeoutRef.current = null;
    }, HIGHLIGHT_MS);
  });

  useDashboardEvent(FOCUS_DECISIONS_EVENT, () => {
    const el = document.querySelector<HTMLElement>('[data-focus-target="decisions"]');
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  return null;
}
