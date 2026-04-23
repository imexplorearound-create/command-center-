import {
  EXTRACTION_TYPE_LABELS,
  type ExtractionType,
  type ValidationAction,
} from "@/lib/maestro/trust-rules";
import { timeAgo } from "@/lib/utils";
import type { MaestroActionRow } from "@/lib/queries";

const ACTION_COLORS: Record<ValidationAction, string> = {
  confirmar: "var(--green, #16a34a)",
  editar: "var(--yellow, #f59e0b)",
  rejeitar: "var(--red, #dc2626)",
};

const ACTION_LABELS: Record<ValidationAction, string> = {
  confirmar: "Confirmou",
  editar: "Editou",
  rejeitar: "Rejeitou",
};

export function RecentActionsList({ actions }: { actions: MaestroActionRow[] }) {
  if (actions.length === 0) {
    return (
      <div
        className="cc-card"
        style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}
      >
        Sem acções registadas. Confirma ou rejeita uma tarefa pendente para começar a calibrar.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {actions.map((a) => {
        const color = ACTION_COLORS[a.action];
        const verb = ACTION_LABELS[a.action];
        const typeLabel =
          EXTRACTION_TYPE_LABELS[a.extractionType as ExtractionType] ?? a.extractionType;
        const sign = a.scoreDelta > 0 ? "+" : "";
        return (
          <div
            key={a.id}
            className="cc-card"
            style={{
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: "0.82rem",
            }}
          >
            <span style={{ color, fontWeight: 600, minWidth: 80 }}>{verb}</span>
            <span style={{ color: "var(--muted)" }}>{typeLabel}</span>
            <span style={{ color: "var(--muted)", flex: 1, fontSize: "0.72rem" }}>
              {a.performedByName ? `por ${a.performedByName}` : ""}
            </span>
            <span
              style={{
                color,
                fontWeight: 600,
                fontFamily: "monospace",
                fontSize: "0.78rem",
              }}
            >
              {sign}
              {a.scoreDelta} ({a.scoreBefore} → {a.scoreAfter})
            </span>
            <span
              style={{
                color: "var(--muted)",
                fontSize: "0.72rem",
                minWidth: 60,
                textAlign: "right",
              }}
            >
              {timeAgo(a.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
