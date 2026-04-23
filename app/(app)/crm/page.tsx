import Link from "next/link";
import { getOpportunities, getCrmOptions, computePipelineStats } from "@/lib/queries/crm-queries";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { ExportButton } from "@/components/shared/export-button";
import { formatCurrency } from "@/lib/utils";
import { Mail } from "lucide-react";
import { getServerT } from "@/lib/i18n/server";

export default async function CrmPage() {
  const t = await getServerT();
  const [opportunities, { people }] = await Promise.all([
    getOpportunities(),
    getCrmOptions(),
  ]);
  const stats = computePipelineStats(opportunities);

  return (
    <div className="portiqa-theme" style={{ minHeight: "100%", padding: "28px 32px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, marginBottom: 24 }}>
        <div>
          <div className="kicker" style={{ marginBottom: 8 }}>CRM · Pipeline</div>
          <h1 className="h1">{t("crm.title")}</h1>
          <p className="lede" style={{ marginTop: 8 }}>
            {t("crm.subtitle", { deals: stats.totalDeals, value: formatCurrency(stats.totalValue), rate: stats.conversionRate })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/crm/campaigns" className="btn btn-ghost">
            <Mail size={14} /> {t("crm.campaigns")}
          </Link>
          <ExportButton type="pipeline" />
        </div>
      </header>
      <PipelineBoard opportunities={opportunities} people={people} />
    </div>
  );
}
