import { getWorkflowTemplates, getWorkflowInstances } from "@/lib/queries";
import { WorkflowsView } from "./workflows-view";

export default async function WorkflowsPage() {
  const [templates, instances] = await Promise.all([
    getWorkflowTemplates(),
    getWorkflowInstances(),
  ]);

  return (
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">🔄 Workflows</div>
        <div className="cc-page-subtitle">Processos reutilizáveis e instâncias activas</div>
      </div>

      <WorkflowsView templates={templates} instances={instances} />
    </>
  );
}
