"use client";

import { formatCurrency } from "@/lib/utils";
import type { CrossDepartmentSummary } from "@/lib/types";

interface Props {
  summary: CrossDepartmentSummary[];
}

export function CrossDepartmentView({ summary }: Props) {
  const sorted = [...summary].sort((a, b) => b.executionPercent - a.executionPercent);

  return (
    <div className="cc-card" style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <th style={thStyle}>Área</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Alocado</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Executado</th>
            <th style={{ ...thStyle, textAlign: "right" }}>%</th>
            <th style={{ ...thStyle, width: 120 }}>Progresso</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Projectos</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const isDeviation = row.executionPercent > 100 || row.executionPercent < 20;
            return (
              <tr key={row.areaId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={tdStyle}>{row.areaName}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{formatCurrency(row.totalAllocated)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{formatCurrency(row.totalExecuted)}</td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    color: isDeviation ? "var(--red)" : "var(--text)",
                    fontWeight: isDeviation ? 600 : 400,
                  }}
                >
                  {row.executionPercent}%
                </td>
                <td style={tdStyle}>
                  <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        background: row.executionPercent > 100 ? "var(--red)" : "var(--accent)",
                        width: `${Math.min(100, row.executionPercent)}%`,
                      }}
                    />
                  </div>
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{row.projectCount}</td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)" }}>
                Sem dados por departamento
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
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
