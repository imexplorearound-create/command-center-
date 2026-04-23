"use client";

import type { FeedEventData } from "@/lib/types";

export const HIGHLIGHT_EVENT = "cc:highlight-decision";

const PILL_LABEL: Record<NonNullable<FeedEventData["pillKind"]>, string> = {
  decide: "decide",
  reve: "revê",
  feito: "feito",
};

const PILL_COLOR: Record<NonNullable<FeedEventData["pillKind"]>, string> = {
  decide: "var(--error, #C0392B)",
  reve: "var(--warning, #D4883A)",
  feito: "var(--muted, #8A8778)",
};

type Props = {
  kind: NonNullable<FeedEventData["pillKind"]>;
  decisionId: string | null;
};

export function FeedPill({ kind, decisionId }: Props) {
  const color = PILL_COLOR[kind];
  const clickable = Boolean(decisionId) && kind !== "feito";

  const onClick = () => {
    if (!decisionId) return;
    window.dispatchEvent(
      new CustomEvent(HIGHLIGHT_EVENT, { detail: { decisionId } }),
    );
  };

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: `color-mix(in oklch, ${color} 14%, transparent)`,
        color,
        border: `1px solid color-mix(in oklch, ${color} 30%, transparent)`,
        cursor: clickable ? "pointer" : "default",
        opacity: clickable ? 1 : 0.7,
      }}
    >
      {PILL_LABEL[kind]}
    </button>
  );
}
