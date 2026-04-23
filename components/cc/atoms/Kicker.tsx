import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  accent?: boolean;
  className?: string;
};

export function Kicker({ children, accent = false, className = "" }: Props) {
  const cls = ["kicker", accent ? "kicker-accent" : "", className].filter(Boolean).join(" ");
  return <span className={cls}>{children}</span>;
}
