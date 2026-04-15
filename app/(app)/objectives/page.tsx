import { getOkrObjectives, getRoadmapItems } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth/dal";
import { getTenantDb } from "@/lib/tenant";
import { OkrTabs } from "./okr-tabs";

export default async function ObjectivesPage() {
  const user = await getAuthUser();

  const db = await getTenantDb();

  const [objectives, roadmapItems, projects] = await Promise.all([
    getOkrObjectives(user),
    getRoadmapItems(user),
    db.project.findMany({
      where: { status: "ativo", archivedAt: null },
      select: { id: true, name: true, slug: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">Estratégia</div>
        <div className="cc-page-subtitle">OKRs e Roadmap 2026</div>
      </div>

      <OkrTabs
        objectives={objectives}
        roadmapItems={roadmapItems}
        projects={projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug, color: p.color ?? "#888" }))}
      />
    </>
  );
}
