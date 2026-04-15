import { getTenantDb } from "@/lib/tenant";
import { formatCurrency } from "@/lib/utils";
import { Map as MapIcon } from "lucide-react";
import Link from "next/link";

export async function InvestmentSummaryCard() {
  const db = await getTenantDb();

  const maps = await db.investmentMap.findMany({
    where: { archivedAt: null },
    include: {
      rubrics: {
        where: { archivedAt: null },
        select: { budgetAllocated: true, budgetExecuted: true },
      },
    },
  });

  const totalBudget = maps.reduce((s, m) => s + Number(m.totalBudget), 0);
  const totalExecuted = maps.reduce((s, m) =>
    s + m.rubrics.reduce((rs, r) => rs + Number(r.budgetExecuted), 0), 0
  );
  const pct = totalBudget > 0 ? Math.round((totalExecuted / totalBudget) * 100) : 0;

  return (
    <Link href="/cross-projects" style={{ textDecoration: "none" }}>
      <div className="cc-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <MapIcon size={18} style={{ color: "var(--cc-primary, #3b82f6)" }} />
          <span style={{ fontWeight: 600, color: "var(--text)" }}>Investimento</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{pct}%</div>
        <div style={{ fontSize: 12, color: "#666" }}>
          {formatCurrency(totalExecuted)} / {formatCurrency(totalBudget)}
        </div>
      </div>
    </Link>
  );
}
