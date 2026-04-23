"use client";

import type { CSSProperties, ReactNode } from "react";

export const FOCUS_DECISIONS_EVENT = "cc:focus-decisions";
export const OPEN_MAESTRO_EVENT = "cc:open-maestro";

type Action =
  | { kind: "focus-decisions" }
  | { kind: "open-maestro"; context?: { crewRoleSlug?: string | null } };

type Props = {
  children: ReactNode;
  action: Action;
  "aria-label"?: string;
  style?: CSSProperties;
};

// Botão "invisível" que herda tipografia do pai (H1, `.meta`, etc.) e
// dispara um CustomEvent no click. Pattern replicado de `FeedPills` —
// Server Components renderizam o texto, client islands finos conectam
// o pub/sub.
export function InlineActionButton({ children, action, style, ...rest }: Props) {
  const onClick = () => {
    const event =
      action.kind === "focus-decisions"
        ? new CustomEvent(FOCUS_DECISIONS_EVENT)
        : new CustomEvent(OPEN_MAESTRO_EVENT, { detail: action.context ?? {} });
    window.dispatchEvent(event);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rest["aria-label"]}
      style={{
        appearance: "none",
        background: "transparent",
        border: "none",
        padding: 0,
        margin: 0,
        font: "inherit",
        color: "inherit",
        textAlign: "inherit",
        cursor: "pointer",
        textDecoration: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
