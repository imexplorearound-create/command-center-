import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Optional top border colour (used to signal health/status at a glance) */
  topBorderColor?: string;
  padding?: number | string;
  className?: string;
  style?: CSSProperties;
};

export function Card({ children, topBorderColor, padding, className = "", style }: Props) {
  const finalStyle: CSSProperties = { ...style };
  if (topBorderColor) finalStyle.borderTop = `2px solid ${topBorderColor}`;
  if (padding !== undefined) finalStyle.padding = typeof padding === "number" ? `${padding}px` : padding;
  return (
    <div className={`card ${className}`.trim()} style={finalStyle}>
      {children}
    </div>
  );
}
