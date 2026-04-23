"use client";

import { useEffect, useRef } from "react";
import { HIGHLIGHT_EVENT } from "./FeedPills";
import { FOCUS_DECISIONS_EVENT } from "./InlineActionButton";

const HIGHLIGHT_MS = 1800;

export function DecisionsHighlighter() {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    function onHighlight(e: Event) {
      const detail = (e as CustomEvent<{ decisionId: string }>).detail;
      const id = detail?.decisionId;
      if (!id) return;
      const el = document.querySelector<HTMLElement>(`[data-decision-id="${id}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("is-highlighted");
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        el.classList.remove("is-highlighted");
        timeoutRef.current = null;
      }, HIGHLIGHT_MS);
    }

    function onFocusDecisions() {
      const el = document.querySelector<HTMLElement>('[data-focus-target="decisions"]');
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    window.addEventListener(HIGHLIGHT_EVENT, onHighlight);
    window.addEventListener(FOCUS_DECISIONS_EVENT, onFocusDecisions);
    return () => {
      window.removeEventListener(HIGHLIGHT_EVENT, onHighlight);
      window.removeEventListener(FOCUS_DECISIONS_EVENT, onFocusDecisions);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return null;
}
