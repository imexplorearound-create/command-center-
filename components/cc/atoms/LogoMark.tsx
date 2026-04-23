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
  size = 22,
  color,
  showWordmark = true,
  wordmarkTone = "inherit",
  className = "",
  style,
}: Props) {
  const stroke = color ?? "var(--accent, #B08A2C)";
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
          d="M4 22 V12 a8 8 0 0 1 16 0 V22"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="6.2" r="1.6" fill={stroke} />
        <path
          d="M12 7.8 L9 10 M12 7.8 L15 10 M12 7.8 L12 11"
          stroke={stroke}
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
      {showWordmark ? (
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "0.01em",
          }}
        >
          Portiqa
          <span style={{ opacity: 0.3, margin: "0 8px" }}>·</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            command
          </span>
        </span>
      ) : null}
    </span>
  );
}
