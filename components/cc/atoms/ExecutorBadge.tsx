import type { CSSProperties } from "react";

export type ExecutorKind = "clawbot" | "claude-code" | "mcp" | "humano" | "manual";

type Props = {
  kind: ExecutorKind;
  name?: string;
  className?: string;
};

const COLOR: Record<ExecutorKind, string> = {
  clawbot:       "var(--accent, #B08A2C)",
  "claude-code": "var(--success, #2D8A5E)",
  mcp:           "var(--info, #3B7DD8)",
  humano:        "var(--muted, #8A8778)",
  manual:        "var(--muted-2, #5A5A55)",
};

const LABEL: Record<ExecutorKind, string> = {
  clawbot:       "Clawbot",
  "claude-code": "Claude Code",
  mcp:           "MCP",
  humano:        "Humano",
  manual:        "Manual",
};

export function ExecutorBadge({ kind, name, className = "" }: Props) {
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "2px 8px",
    borderRadius: "var(--radius-badge, 6px)",
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: COLOR[kind],
    border: `1px solid color-mix(in oklch, ${COLOR[kind]} 30%, transparent)`,
    background: "transparent",
  };

  return (
    <span className={className} style={style} title={name}>
      {name ?? LABEL[kind]}
    </span>
  );
}
