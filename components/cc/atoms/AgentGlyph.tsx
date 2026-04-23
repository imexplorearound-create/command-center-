import type { CSSProperties } from "react";
import type { CrewRoleSlug } from "./RoleTag";

type Props = {
  /** "maestro" for the conductor glyph, or a CrewRole slug for its papel glyph */
  kind: "maestro" | CrewRoleSlug;
  size?: number;
  color?: string;
  className?: string;
};

/**
 * Minimal placeholder glyphs rendered as SVG. The design bundle from Portiqa
 * will eventually ship distinct icons for each crew role; these are stand-ins
 * so the Dashboard can render before the real SVGs arrive.
 */
export function AgentGlyph({ kind, size = 24, color, className = "" }: Props) {
  const stroke = color ?? (kind === "maestro" ? "var(--accent, #B08A2C)" : "currentColor");
  const style: CSSProperties = { display: "inline-block", flexShrink: 0 };

  switch (kind) {
    case "maestro":
      // Batuta sobre quadrado vazado
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
          <rect x="3" y="3" width="18" height="18" rx="2" stroke={stroke} strokeWidth="1.2" />
          <path d="M7 17L17 7" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="7" cy="17" r="1.4" fill={stroke} />
        </svg>
      );
    case "pipeline":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
          <path d="M4 12C4 8 8 6 12 6s8 2 8 6-4 6-8 6-8-2-8-6z" stroke={stroke} strokeWidth="1.2" />
          <path d="M8 12h8" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "comms":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
          <path d="M4 6h16v10H8l-4 4V6z" stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      );
    case "ops":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
          <path d="M6 9l-3 3 3 3" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 9l3 3-3 3" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 5l-4 14" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "qa":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className}>
          <circle cx="11" cy="11" r="6" stroke={stroke} strokeWidth="1.2" />
          <path d="M16 16l4 4" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
  }
}
