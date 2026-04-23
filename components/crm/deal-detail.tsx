"use client";

import type { OpportunityDetailData } from "@/lib/types";
import {
  OPPORTUNITY_STAGE_LABELS,
  OPPORTUNITY_SOURCE_LABELS,
} from "@/lib/validation/opportunity-schema";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ActivityTimeline } from "./activity-timeline";
import { ConvertToProjectButton } from "./convert-to-project-button";

interface Props {
  opportunity: OpportunityDetailData;
}

function stageColor(stageId: string): string {
  switch (stageId) {
    case "contacto_inicial": return "var(--muted, #888)";
    case "qualificacao": return "var(--accent, #378ADD)";
    case "proposta": return "var(--yellow, #eab308)";
    case "negociacao": return "var(--orange, #f59e0b)";
    case "ganho": return "var(--green, #22c55e)";
    case "perdido": return "var(--red, #ef4444)";
    default: return "var(--muted)";
  }
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: "0.72rem", color: "var(--muted, #999)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: "0.88rem" }}>{value}</span>
    </div>
  );
}

export function DealDetail({ opportunity }: Props) {
  const o = opportunity;
  const stageName = OPPORTUNITY_STAGE_LABELS[o.stageId] ?? o.stageId;
  const sourceName = o.source
    ? OPPORTUNITY_SOURCE_LABELS[o.source as keyof typeof OPPORTUNITY_SOURCE_LABELS] ?? o.source
    : null;

  const canConvert = !o.convertedProjectId && o.stageId !== "perdido";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, letterSpacing: -0.5 }}>
            {o.title}
          </h1>
          <span
            style={{
              display: "inline-block",
              padding: "3px 10px",
              borderRadius: 6,
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              background: `color-mix(in srgb, ${stageColor(o.stageId)} 15%, transparent)`,
              color: stageColor(o.stageId),
              border: `1px solid color-mix(in srgb, ${stageColor(o.stageId)} 30%, transparent)`,
            }}
          >
            {stageName}
          </span>
        </div>
        {o.companyName && (
          <div style={{ fontSize: "0.92rem", color: "var(--muted, #999)" }}>
            {o.companyName}
            {o.companyNif && <> &middot; NIF {o.companyNif}</>}
          </div>
        )}
      </div>

      {/* Info grid */}
      <div
        className="cc-deal-info-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "16px 24px",
          padding: 20,
          background: "var(--bg-subtle, rgba(255,255,255,0.02))",
          borderRadius: "var(--radius, 10px)",
          border: "1px solid var(--border, rgba(255,255,255,0.1))",
        }}
      >
        <InfoItem
          label="Valor"
          value={o.value != null ? formatCurrency(o.value, o.currency) : "---"}
        />
        <InfoItem label="Probabilidade" value={`${o.probability}%`} />
        <InfoItem label="Contacto" value={o.contactName} />
        <InfoItem label="Responsável" value={o.ownerName} />
        <InfoItem label="Fecho esperado" value={o.expectedClose ? formatDate(o.expectedClose) : null} />
        <InfoItem label="Origem" value={sourceName} />
        <InfoItem label="Dias na fase" value={`${o.daysInStage}d`} />
        <InfoItem label="Criado em" value={formatDate(o.createdAt)} />
        {o.closedAt && <InfoItem label="Fechado em" value={formatDate(o.closedAt)} />}
      </div>

      {/* Convert button */}
      {canConvert && (
        <div>
          <ConvertToProjectButton opportunityId={o.id} />
        </div>
      )}

      {o.convertedProjectId && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 8,
            fontSize: "0.85rem",
            color: "var(--green, #22c55e)",
          }}
        >
          Convertido em projecto
        </div>
      )}

      {/* Activities */}
      <ActivityTimeline activities={o.activities} opportunityId={o.id} />
    </div>
  );
}
