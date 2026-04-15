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
    <>
      <div className="cc-page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="cc-page-title">{t("crm.title")}</div>
            <div className="cc-page-subtitle">
              {t("crm.subtitle", { deals: stats.totalDeals, value: formatCurrency(stats.totalValue), rate: stats.conversionRate })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/crm/campaigns" className="cc-btn cc-btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Mail size={16} /> {t("crm.campaigns")}
            </Link>
            <ExportButton type="pipeline" />
          </div>
        </div>
      </div>
      <PipelineBoard opportunities={opportunities} people={people} />
    </>
  );
}
