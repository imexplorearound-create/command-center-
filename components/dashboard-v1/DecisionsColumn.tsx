import { Kicker, Pill } from "@/components/cc/atoms";
import { SEVERITY_COLOR } from "@/lib/dashboard-helpers";
import type { OpenDecisionData } from "@/lib/types";
import { DecisionsHighlighter } from "./DecisionsHighlighter";

type Props = {
  decisions: OpenDecisionData[];
};

export function DecisionsColumn({ decisions }: Props) {
  const expanded = decisions.slice(0, 3);
  const overflow = decisions.slice(3);

  return (
    <section>
      <DecisionsHighlighter />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <Kicker>Decisões</Kicker>
        {decisions.length > 7 ? (
          <span
            className="mono"
            style={{ color: "var(--warning, #D4883A)" }}
            title="Muitas decisões abertas — considera adiar ou delegar"
          >
            {decisions.length} abertas
          </span>
        ) : null}
      </div>

      {decisions.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            color: "var(--muted)",
            fontSize: 13,
          }}
        >
          Nada a decidir agora. Volta quando chegar notificação.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {expanded.map((d) => (
            <ExpandedDecisionCard key={d.id} decision={d} />
          ))}
          {overflow.length > 0 ? (
            <div
              style={{
                marginTop: 6,
                paddingTop: 10,
                borderTop: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {overflow.map((d) => (
                <CompactDecisionRow key={d.id} decision={d} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ExpandedDecisionCard({ decision }: { decision: OpenDecisionData }) {
  const color = SEVERITY_COLOR[decision.severity] ?? "var(--accent)";
  return (
    <article
      className="card"
      data-decision-id={decision.id}
      style={{
        background: "var(--bg-2)",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        {decision.crewRoleSlug ? (
          <Pill color={color}>{decision.crewRoleSlug}</Pill>
        ) : (
          <span />
        )}
        {decision.deadline ? (
          <span
            className="mono"
            style={{ color: "var(--accent)", fontSize: 10 }}
          >
            {decision.deadline}
          </span>
        ) : null}
      </header>
      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 15,
          fontWeight: 600,
          color: "var(--ink)",
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {decision.title}
      </h3>
      {decision.context ? (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--muted)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {decision.context}
        </p>
      ) : null}
      <footer style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button type="button" className="btn btn-primary">Abrir</button>
        <button type="button" className="btn btn-ghost">Adiar</button>
      </footer>
    </article>
  );
}

function CompactDecisionRow({ decision }: { decision: OpenDecisionData }) {
  return (
    <div
      data-decision-id={decision.id}
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 8,
        padding: "6px 0",
        fontSize: 12,
      }}
    >
      <span style={{ color: "var(--ink-2)", flex: 1, lineHeight: 1.3 }}>{decision.title}</span>
      {decision.deadline ? (
        <span className="mono" style={{ color: "var(--muted)", fontSize: 9 }}>
          {decision.deadline}
        </span>
      ) : null}
    </div>
  );
}
