import { OPPORTUNITY_STAGE_LABELS } from "@/lib/validation/opportunity-schema";
import { formatCurrency } from "@/lib/utils";

interface PipelineStats {
  totalDeals: number;
  totalValue: number;
  conversionRate: number;
  byStage: Record<string, { count: number; value: number }>;
}

export function PipelineWidget({ stats }: { stats: PipelineStats }) {
  if (stats.totalDeals === 0) return null;

  return (
    <div className="cc-card" style={{ marginBottom: 16 }}>
      <div className="cc-section-title">🤝 Pipeline</div>
      <div style={{ display: "flex", gap: 24, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)" }}>
            {formatCurrency(stats.totalValue)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>valor total</div>
        </div>
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)" }}>
            {stats.totalDeals}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>oportunidades</div>
        </div>
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--green)" }}>
            {stats.conversionRate}%
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>conversão</div>
        </div>
      </div>
      {/* Mini stage breakdown */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(stats.byStage).map(([stage, data]) => (
          <div
            key={stage}
            style={{
              fontSize: "0.75rem",
              color: "var(--muted)",
              background: "rgba(255,255,255,0.04)",
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            {OPPORTUNITY_STAGE_LABELS[stage as keyof typeof OPPORTUNITY_STAGE_LABELS] ?? stage}:{" "}
            {data.count}
          </div>
        ))}
      </div>
    </div>
  );
}
