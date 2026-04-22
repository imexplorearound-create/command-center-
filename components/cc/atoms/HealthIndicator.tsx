import type { CSSProperties } from "react";

export type HealthState = "ok" | "warn" | "block";
export type CrewState = "live" | "pending" | "thinking" | "idle";

type Props = {
  state: HealthState | CrewState;
  size?: number;
  label?: string;
};

const COLOR: Record<HealthState | CrewState, string> = {
  ok: "var(--success, #2D8A5E)",
  warn: "var(--warning, #D4883A)",
  block: "var(--error, #C0392B)",
  live: "var(--success, #2D8A5E)",
  pending: "var(--accent, #B08A2C)",
  thinking: "var(--info, #3B7DD8)",
  idle: "var(--muted, #8A8778)",
};

export function HealthIndicator({ state, size = 8, label }: Props) {
  const dotStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: 999,
    background: COLOR[state],
    display: "inline-block",
    flexShrink: 0,
  };
  if (state === "thinking") {
    dotStyle.animation = "cc-pulse 1.4s ease-in-out infinite";
  }
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <span style={dotStyle} />
      {label ? <span className="mono">{label}</span> : null}
    </span>
  );
}
