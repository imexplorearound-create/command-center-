import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  color?: string; // hex or CSS color; overrides default accent
  variant?: "solid" | "ghost";
  className?: string;
};

export function Pill({ children, color, variant = "solid", className = "" }: Props) {
  const style: CSSProperties = {};
  if (color) {
    style.color = color;
    style.background = variant === "ghost" ? "transparent" : `color-mix(in oklch, ${color} 14%, transparent)`;
    style.borderColor = `color-mix(in oklch, ${color} 30%, transparent)`;
  }
  return (
    <span className={`pill ${className}`.trim()} style={style}>
      {children}
    </span>
  );
}
