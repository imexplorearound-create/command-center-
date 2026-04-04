import { getOkrObjectives, getRoadmapItems } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { OkrTabs } from "./okr-tabs";

export default async function ObjectivesPage() {
  const user = await getAuthUser();

  const [objectives, roadmapItems, projects] = await Promise.all([
    getOkrObjectives(user),
    getRoadmapItems(user),
    prisma.project.findMany({
      where: { status: "ativo" },
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
