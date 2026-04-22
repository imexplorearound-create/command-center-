import Link from "next/link";
import { Kicker } from "@/components/cc/atoms";
import { SEVERITY_COLOR } from "@/lib/dashboard-helpers";
import type { PassiveAlertData } from "@/lib/types";

type Props = {
  alerts: PassiveAlertData[];
};

export function AlertsPassive({ alerts }: Props) {
  return (
    <section style={{ marginTop: 28 }}>
      <Kicker>Alertas</Kicker>
      {alerts.length === 0 ? (
        <p
          style={{
            marginTop: 10,
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          Sem alertas activos.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: "12px 0 0",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {alerts.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AlertRow({ alert }: { alert: PassiveAlertData }) {
  const color = SEVERITY_COLOR[alert.severity] ?? "var(--muted)";
  const content = (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "8px 10px",
        background: "var(--bg-2)",
        borderRadius: "var(--radius-input)",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--ink-2)",
          lineHeight: 1.4,
          flex: 1,
        }}
      >
        {alert.text}
      </span>
    </div>
  );
  if (alert.href) {
    return (
      <li>
        <Link href={alert.href} style={{ textDecoration: "none", color: "inherit" }}>
          {content}
        </Link>
      </li>
    );
  }
  return <li>{content}</li>;
}
