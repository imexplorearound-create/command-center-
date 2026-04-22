import type { CSSProperties } from "react";

type Props = {
  size?: number;
  color?: string;
  showWordmark?: boolean;
  wordmarkTone?: "inherit" | "ink" | "accent";
  className?: string;
  style?: CSSProperties;
};

/**
 * Portiqa · Command wordmark. Renders the `q` in italic serif (brand book rule).
 * Used in the top nav as the brand anchor while Command Center shares the
 * Portiqa identity (see addendum-alinhamento-v2_1 §4.2).
 */
export function LogoMark({
  size = 18,
  color,
  showWordmark = true,
  wordmarkTone = "inherit",
  className = "",
  style,
}: Props) {
  const stroke = color ?? "currentColor";
  const wordmarkColor =
    wordmarkTone === "accent"
      ? "var(--accent, #B08A2C)"
      : wordmarkTone === "ink"
        ? "var(--ink, #F4EFE6)"
        : "inherit";

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        color: wordmarkColor,
        ...style,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 18V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10"
          stroke={stroke}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark ? (
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          porti<em style={{ color: "var(--accent, #B08A2C)", fontStyle: "italic" }}>q</em>a
          <span style={{ opacity: 0.3, margin: "0 8px" }}>·</span>
          <span style={{ fontFamily: "var(--font-sans)", fontWeight: 500, letterSpacing: "0.08em" }}>command</span>
        </span>
      ) : null}
    </span>
  );
}
