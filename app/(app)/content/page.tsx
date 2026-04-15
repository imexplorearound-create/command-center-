import { getContentItems, getProjectsForContentSelect } from "@/lib/queries";
import { ContentPipeline } from "./content-pipeline";

export default async function ContentPage() {
  const [items, projects] = await Promise.all([
    getContentItems(),
    getProjectsForContentSelect(),
  ]);

  return (
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">🎬 Pipeline de Conteúdo</div>
        <div className="cc-page-subtitle">Propostas → Publicação</div>
      </div>

      <ContentPipeline items={items} projects={projects} />
    </>
  );
}
