"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { generateTasksFromRubric } from "@/lib/actions/investment-actions";
import { RubricModal } from "./rubric-modal";
import type { InvestmentMapData, InvestmentRubricData } from "@/lib/types";

interface Props {
  map: InvestmentMapData;
  areas: { id: string; name: string }[];
  canEdit: boolean;
}

export function InvestmentMapView({ map, areas, canEdit }: Props) {
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [editingRubric, setEditingRubric] = useState<InvestmentRubricData | undefined>();
  const [generating, setGenerating] = useState<string | null>(null);

  async function handleGenerateTasks(rubricId: string) {
    setGenerating(rubricId);
    const result = await generateTasksFromRubric(rubricId);
    setGenerating(null);
    if ("error" in result) {
      toast.error(result.error);
    } else if (result.data) {
      toast.success(`${result.data.taskCount} tarefa(s) criada(s)`);
    }
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
          {map.projectName}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Orçamento total: <strong style={{ color: "var(--text)" }}>{formatCurrency(map.totalBudget)}</strong>
          </span>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Executado: <strong style={{ color: "var(--text)" }}>{formatCurrency(map.totalExecuted)}</strong>
          </span>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            {map.executionPercent}%
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", marginBottom: 12 }}>
          <div
            style={{
              height: "100%",
              borderRadius: 4,
              background: map.executionPercent > 90 ? "var(--red)" : "var(--accent)",
              width: `${Math.min(100, map.executionPercent)}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Funding info */}
        {(map.fundingSource || map.fundingPercentage !== null) && (
          <div style={{ display: "flex", gap: 16, fontSize: "0.82rem", color: "var(--muted)" }}>
            {map.fundingSource && <span>Fonte: {map.fundingSource}</span>}
            {map.fundingPercentage !== null && <span>Financiamento: {map.fundingPercentage}%</span>}
          </div>
        )}
      </div>

      {/* Rubrics table */}
      <div className="cc-card" style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th style={thStyle}>Rubrica</th>
              <th style={thStyle}>Área</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Alocado</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Executado</th>
              <th style={{ ...thStyle, textAlign: "right" }}>%</th>
              <th style={{ ...thStyle, width: 120 }}>Progresso</th>
              {canEdit && <th style={{ ...thStyle, width: 140 }} />}
            </tr>
          </thead>
          <tbody>
            {map.rubrics.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={tdStyle}>{r.name}</td>
                <td style={{ ...tdStyle, color: "var(--muted)" }}>{r.areaName ?? "—"}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{formatCurrency(r.budgetAllocated)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{formatCurrency(r.budgetExecuted)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{r.executionPercent}%</td>
                <td style={tdStyle}>
                  <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        background: r.executionPercent > 90 ? "var(--red)" : "var(--accent)",
                        width: `${Math.min(100, r.executionPercent)}%`,
                      }}
                    />
                  </div>
                </td>
                {canEdit && (
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => { setEditingRubric(r); setShowRubricModal(true); }}
                      style={actionBtnStyle}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleGenerateTasks(r.id)}
                      disabled={generating === r.id}
                      style={{ ...actionBtnStyle, marginLeft: 4 }}
                    >
                      {generating === r.id ? "..." : "Tarefas"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {map.rubrics.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 7 : 6} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)" }}>
                  Sem rubricas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => { setEditingRubric(undefined); setShowRubricModal(true); }}
            style={{
              background: "var(--accent)",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: 6,
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Rubrica
          </button>
        </div>
      )}

      {showRubricModal && (
        <RubricModal
          rubric={editingRubric}
          investmentMapId={map.id}
          areas={areas}
          onClose={() => { setShowRubricModal(false); setEditingRubric(undefined); }}
        />
      )}
    </>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "0.72rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "var(--muted)",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  color: "var(--text)",
};

const actionBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "var(--muted)",
  padding: "3px 8px",
  borderRadius: 4,
  fontSize: "0.75rem",
  cursor: "pointer",
};
