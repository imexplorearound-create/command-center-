import Link from "next/link";
import { getOpportunities, getCrmOptions, computePipelineStats } from "@/lib/queries/crm-queries";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { ExportButton } from "@/components/shared/export-button";
import { PageHeader } from "@/components/layout/page-header";
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
    <PageHeader
      kicker="CRM · Pipeline"
      title={t("crm.title")}
      subtitle={t("crm.subtitle", { deals: stats.totalDeals, value: formatCurrency(stats.totalValue), rate: stats.conversionRate })}
      actions={
        <>
          <Link href="/crm/campaigns" className="btn btn-ghost">
            <Mail size={14} /> {t("crm.campaigns")}
          </Link>
          <ExportButton type="pipeline" />
        </>
      }
    >
      <PipelineBoard opportunities={opportunities} people={people} />
    </PageHeader>
  );
}
