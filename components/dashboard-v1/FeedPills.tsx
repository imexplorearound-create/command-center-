"use client";

import { SEVERITY_COLOR } from "@/lib/dashboard-helpers";
import type { FeedEventData } from "@/lib/types";

export const HIGHLIGHT_EVENT = "cc:highlight-decision";

type PillKind = NonNullable<FeedEventData["pillKind"]>;

const PILL_LABEL: Record<PillKind, string> = {
  decide: "decide",
  reve: "revê",
  feito: "feito",
};

const PILL_COLOR: Record<PillKind, string> = {
  decide: SEVERITY_COLOR.block,
  reve: SEVERITY_COLOR.warn,
  feito: "var(--muted, #8A8778)",
};

type Props = {
  kind: PillKind;
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
      className="pill"
      onClick={onClick}
      disabled={!clickable}
      style={{
        background: `color-mix(in oklch, ${color} 14%, transparent)`,
        color,
        borderColor: `color-mix(in oklch, ${color} 30%, transparent)`,
        cursor: clickable ? "pointer" : "default",
        opacity: clickable ? 1 : 0.7,
      }}
    >
      {PILL_LABEL[kind]}
    </button>
  );
}
