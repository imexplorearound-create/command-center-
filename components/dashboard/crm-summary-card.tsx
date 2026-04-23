import { getTenantDb } from "@/lib/tenant";
import { formatCurrency } from "@/lib/utils";
import { Handshake } from "lucide-react";
import Link from "next/link";

export async function CrmSummaryCard() {
  const db = await getTenantDb();
  const opps = await db.opportunity.findMany({
    where: { archivedAt: null },
    select: { stageId: true, value: true },
  });

  const total = opps.length;
  const totalValue = opps.reduce((s, o) => s + Number(o.value ?? 0), 0);
  const won = opps.filter((o) => o.stageId === "ganho").length;
  const rate = total > 0 ? Math.round((won / total) * 100) : 0;

  return (
    <Link href="/crm" style={{ textDecoration: "none" }}>
      <div className="cc-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Handshake size={18} style={{ color: "var(--cc-primary, #3b82f6)" }} />
          <span style={{ fontWeight: 600, color: "var(--text)" }}>Pipeline</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{total}</div>
        <div style={{ fontSize: 12, color: "#666" }}>
          {formatCurrency(totalValue)} · {rate}% conversão
        </div>
      </div>
    </Link>
  );
}
