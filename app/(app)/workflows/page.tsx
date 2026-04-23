import { getWorkflowTemplates, getWorkflowInstances } from "@/lib/queries";
import { WorkflowsView } from "./workflows-view";
import { getServerT } from "@/lib/i18n/server";

export default async function WorkflowsPage() {
  const t = await getServerT();
  const [templates, instances] = await Promise.all([
    getWorkflowTemplates(),
    getWorkflowInstances(),
  ]);

  return (
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">🔄 {t("workflows.title")}</div>
        <div className="cc-page-subtitle">{t("workflows.subtitle")}</div>
      </div>

      <WorkflowsView templates={templates} instances={instances} />
    </>
  );
}
