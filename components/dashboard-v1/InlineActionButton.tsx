"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  FOCUS_DECISIONS_EVENT,
  OPEN_MAESTRO_EVENT,
  dispatchDashboardEvent,
} from "@/lib/dashboard-events";

// Re-exports para compatibilidade com call sites anteriores à extracção
// de `@/lib/dashboard-events`. Para novo código, importar daí directamente.
export { FOCUS_DECISIONS_EVENT, OPEN_MAESTRO_EVENT };

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
    if (action.kind === "focus-decisions") {
      dispatchDashboardEvent(FOCUS_DECISIONS_EVENT);
    } else {
      dispatchDashboardEvent(OPEN_MAESTRO_EVENT, action.context ?? {});
    }
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
