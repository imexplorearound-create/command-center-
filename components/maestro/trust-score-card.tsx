import {
  EXTRACTION_TYPE_LABELS,
  thresholdFor,
  THRESHOLD_LABELS,
  type ExtractionType,
  type ThresholdLevel,
} from "@/lib/maestro/trust-rules";
import type { TrustScoreRow } from "@/lib/queries";

const THRESHOLD_COLORS: Record<ThresholdLevel, string> = {
  aprendizagem: "var(--red, #dc2626)",
  calibracao: "var(--yellow, #f59e0b)",
  confianca: "var(--accent, #378ADD)",
  autonomia: "var(--green, #16a34a)",
  pleno: "#0d9488",
};

export function TrustScoreCard({ row }: { row: TrustScoreRow }) {
  const level = thresholdFor(row.score);
  const color = THRESHOLD_COLORS[level];
  const label =
    EXTRACTION_TYPE_LABELS[row.extractionType as ExtractionType] ?? row.extractionType;

  return (
    <div className="cc-card" style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: "1.25rem", fontWeight: 700, color }}>{row.score}</span>
      </div>

      <div
        className="cc-progress-bar"
        style={{ height: 8, marginBottom: 6, background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="cc-progress-fill"
          style={{
            width: `${row.score}%`,
            backgroundColor: color,
            height: "100%",
            borderRadius: 4,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.72rem",
          color: "var(--muted, #999)",
        }}
      >
        <span style={{ color, fontWeight: 600 }}>{THRESHOLD_LABELS[level]}</span>
        <span>
          ✓ {row.confirmations} · ✎ {row.edits} · ✗ {row.rejections}
        </span>
      </div>
    </div>
  );
}
