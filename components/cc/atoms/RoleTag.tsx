import type { CSSProperties } from "react";

export type CrewRoleSlug = "pipeline" | "comms" | "ops" | "qa";

type Props = {
  slug: CrewRoleSlug;
  label?: string;
  color?: string;
  className?: string;
};

// Defaults used when the DB seed of CrewRole isn't available yet.
const DEFAULTS: Record<CrewRoleSlug, { label: string; color: string }> = {
  pipeline: { label: "Pipeline", color: "#D4A843" },
  comms:    { label: "Comms",    color: "#7C5CBF" },
  ops:      { label: "Ops",      color: "#3B7DD8" },
  qa:       { label: "QA",       color: "#2D8A5E" },
};

export function RoleTag({ slug, label, color, className = "" }: Props) {
  const def = DEFAULTS[slug];
  const displayLabel = label ?? def.label;
  const displayColor = color ?? def.color;

  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 10px",
    borderRadius: "var(--radius-badge, 6px)",
    fontFamily: "var(--font-serif)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "-0.005em",
    color: displayColor,
    background: `color-mix(in oklch, ${displayColor} 10%, transparent)`,
    border: `1px solid color-mix(in oklch, ${displayColor} 24%, transparent)`,
  };

  return (
    <span className={className} style={style}>
      {displayLabel}
    </span>
  );
}
