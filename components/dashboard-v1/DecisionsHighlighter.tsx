"use client";

import { useEffect } from "react";
import { HIGHLIGHT_EVENT } from "./FeedPills";

const HIGHLIGHT_MS = 1800;

export function DecisionsHighlighter() {
  useEffect(() => {
    function onHighlight(e: Event) {
      const detail = (e as CustomEvent<{ decisionId: string }>).detail;
      const id = detail?.decisionId;
      if (!id) return;
      const el = document.querySelector<HTMLElement>(`[data-decision-id="${id}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("is-highlighted");
      const t = window.setTimeout(() => el.classList.remove("is-highlighted"), HIGHLIGHT_MS);
      return () => window.clearTimeout(t);
    }

    window.addEventListener(HIGHLIGHT_EVENT, onHighlight);
    return () => window.removeEventListener(HIGHLIGHT_EVENT, onHighlight);
  }, []);

  return null;
}
