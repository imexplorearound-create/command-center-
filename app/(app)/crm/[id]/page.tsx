import { redirect } from "next/navigation";
import { getOpportunityById } from "@/lib/queries/crm-queries";
import { DealDetail } from "@/components/crm/deal-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CrmDetailPage({ params }: Props) {
  const { id } = await params;
  const opportunity = await getOpportunityById(id);

  if (!opportunity) {
    redirect("/crm");
  }

  return (
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">{opportunity.title}</div>
        <div className="cc-page-subtitle">Detalhe do negócio</div>
      </div>
      <DealDetail opportunity={opportunity} />
    </>
  );
}
