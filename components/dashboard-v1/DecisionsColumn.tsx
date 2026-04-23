import Link from "next/link";
import { Kicker, Pill } from "@/components/cc/atoms";
import { SEVERITY_COLOR, formatSince } from "@/lib/dashboard-helpers";
import type { OpenDecisionData, ResolvedDecisionData } from "@/lib/types";
import { DecisionsHighlighter } from "./DecisionsHighlighter";
import { DecisionResolveButton } from "./DecisionResolveButton";

type Props = {
  decisions: OpenDecisionData[];
  resolved?: ResolvedDecisionData[];
  viewing?: "open" | "resolved";
};

export function DecisionsColumn({ decisions, resolved = [], viewing = "open" }: Props) {
  const isResolved = viewing === "resolved";
  const expanded = decisions.slice(0, 3);
  const overflow = decisions.slice(3);

  return (
    <section>
      <DecisionsHighlighter />
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
        <Kicker>Decisões</Kicker>
        <nav style={{ display: "flex", gap: 6 }} aria-label="vista das decisões">
          <ToggleLink href="/" active={!isResolved} label={`abertas · ${decisions.length}`} />
          <ToggleLink
            href="/?decisions=resolved"
            active={isResolved}
            label={`resolvidas · ${resolved.length}`}
          />
        </nav>
      </header>

      {isResolved ? (
        <ResolvedList resolved={resolved} />
      ) : decisions.length === 0 ? (
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

function ToggleLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className="mono"
      style={{
        textDecoration: "none",
        color: active ? "var(--accent)" : "var(--muted)",
        borderBottom: active ? "1px solid var(--accent)" : "1px solid transparent",
        paddingBottom: 2,
      }}
    >
      {label}
    </Link>
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
        <DecisionResolveButton decisionId={decision.id} />
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

function ResolvedList({ resolved }: { resolved: ResolvedDecisionData[] }) {
  if (resolved.length === 0) {
    return (
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          color: "var(--muted)",
          fontSize: 13,
        }}
      >
        Nenhuma decisão resolvida nas últimas 24h.
      </p>
    );
  }
  const now = Date.now();
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {resolved.map((d) => {
        const ago = formatSince(now - new Date(d.resolvedAt).getTime());
        return (
          <li
            key={d.id}
            className="card"
            style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink-2)",
                  textDecoration: "line-through",
                  textDecorationColor: "var(--muted)",
                }}
              >
                {d.title}
              </span>
              <span className="mono" style={{ color: "var(--muted)" }}>
                {ago}
              </span>
            </div>
            {d.resolutionNote ? (
              <p className="meta" style={{ margin: 0 }}>
                {d.resolvedByName ? `${d.resolvedByName} · ` : ""}
                {d.resolutionNote}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
