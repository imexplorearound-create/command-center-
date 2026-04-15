import { getInvestmentMapsOverview, computeCrossDepartmentSummary } from "@/lib/queries/investment-queries";
import { CrossDepartmentView } from "@/components/investment/cross-department-view";
import { ExportButton } from "@/components/shared/export-button";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";

export default async function CrossProjectsPage() {
  const t = await getServerT();
  const maps = await getInvestmentMapsOverview();
  const departmentSummary = computeCrossDepartmentSummary(maps);

  const totalBudget = maps.reduce((s, m) => s + m.totalBudget, 0);
  const totalExecuted = maps.reduce((s, m) => s + m.totalExecuted, 0);

  return (
    <>
      <div className="cc-page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="cc-page-title">{t("investment.title")}</div>
            <div className="cc-page-subtitle">
              {t("investment.subtitle", { projects: maps.length, budget: formatCurrency(totalBudget), executed: formatCurrency(totalExecuted) })}
            </div>
          </div>
          <ExportButton type="investments" formats={["excel"]} />
        </div>
      </div>

      {/* Project cards with execution bars */}
      <div className="cc-section-title">{t("investment.section.projects")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, marginBottom: 24 }}>
        {maps.map(map => (
          <Link key={map.id} href={`/cross-projects/${map.projectId}`} style={{ textDecoration: "none" }}>
            <div className="cc-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{map.projectName}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--muted)", marginBottom: 6 }}>
                <span>{formatCurrency(map.totalExecuted)} / {formatCurrency(map.totalBudget)}</span>
                <span>{map.executionPercent}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: "100%", borderRadius: 3, background: map.executionPercent > 90 ? "var(--red)" : "var(--accent)", width: `${Math.min(100, map.executionPercent)}%` }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {departmentSummary.length > 0 && (
        <>
          <div className="cc-section-title">{t("investment.section.by_department")}</div>
          <CrossDepartmentView summary={departmentSummary} />
        </>
      )}
    </>
  );
}
