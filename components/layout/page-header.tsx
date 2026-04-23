import type { ReactNode } from "react";

type Props = {
  kicker: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({ kicker, title, subtitle, actions, children }: Props) {
  return (
    <div className="portiqa-theme" style={{ minHeight: "100%", padding: "28px 32px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div>
          <div className="kicker" style={{ marginBottom: 8 }}>{kicker}</div>
          <h1 className="h1">{title}</h1>
          {subtitle ? <p className="lede" style={{ marginTop: 8 }}>{subtitle}</p> : null}
        </div>
        {actions ? <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}
