import Link from "next/link";
import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/utils";
import type { DevVelocityData, PipelineValueData } from "@/lib/types";

type Props = {
  projectsAtRisk: number;
  openDecisions: number;
  pendingFeedback: number;
  devVelocity: DevVelocityData;
  pipelineValue: PipelineValueData;
};

export function MetricsStrip({
  projectsAtRisk,
  openDecisions,
  pendingFeedback,
  devVelocity,
  pipelineValue,
}: Props) {
  const commitsDelta = devVelocity.commits7d - devVelocity.commitsPrev7d;
  const pipelineEuros = pipelineValue.weightedValueCents / 100;

  return (
    <section
      aria-label="Métricas-chave"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}
    >
      <MetricCard
        href="/projects?filter=at-risk"
        label="Projectos em risco"
        value={projectsAtRisk}
        hint={projectsAtRisk === 0 ? "tudo ok" : "ver lista"}
        tone={projectsAtRisk === 0 ? "ok" : "warn"}
      />
      <MetricCard
        href="/?highlight=decisions"
        label="Decisões hoje"
        value={openDecisions}
        hint={openDecisions === 0 ? "vazio" : "ver coluna"}
        tone={openDecisions > 0 ? "accent" : "muted"}
      />
      <MetricCard
        href="/feedback?status=pending"
        label="Feedback pendente"
        value={pendingFeedback}
        hint={pendingFeedback === 0 ? "triado" : "triar"}
        tone={pendingFeedback > 0 ? "accent" : "muted"}
      />
      <MetricCard
        href="/projects"
        label="Dev velocity · 7d"
        value={devVelocity.commits7d}
        hint={
          commitsDelta === 0
            ? "estável"
            : commitsDelta > 0
              ? `+${commitsDelta} vs 7d`
              : `${commitsDelta} vs 7d`
        }
        tone={commitsDelta >= 0 ? "ok" : "warn"}
      />
      <MetricCard
        href="/crm"
        label="Pipeline valor"
        value={formatCurrency(pipelineEuros, pipelineValue.currency)}
        hint="ponderado"
        tone="accent"
      />
    </section>
  );
}

type Tone = "ok" | "warn" | "accent" | "muted";

const TONE_COLOR: Record<Tone, string> = {
  ok: "var(--success, #2D8A5E)",
  warn: "var(--warning, #D4883A)",
  accent: "var(--accent, #B08A2C)",
  muted: "var(--muted, #8A8778)",
};

function MetricCard({
  href,
  label,
  value,
  hint,
  tone,
}: {
  href: string;
  label: string;
  value: ReactNode;
  hint: string;
  tone: Tone;
}) {
  const color = TONE_COLOR[tone];
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <div
        className="card"
        style={{
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          borderTop: `2px solid ${color}`,
        }}
      >
        <div className="kicker" style={{ fontSize: 9 }}>{label}</div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 28,
            fontWeight: 600,
            lineHeight: 1,
            color: "var(--ink)",
          }}
        >
          {value}
        </div>
        <div className="mono" style={{ color, textTransform: "none", fontSize: 10 }}>
          {hint}
        </div>
      </div>
    </Link>
  );
}
