import { getOkrObjectives, getRoadmapItems } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth/dal";
import { getTenantDb } from "@/lib/tenant";
import { OkrTabs } from "./okr-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { getServerT } from "@/lib/i18n/server";

export default async function ObjectivesPage() {
  const user = await getAuthUser();
  const t = await getServerT();

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
    <PageHeader
      kicker="Objectivos · OKRs"
      title={t("objectives.title")}
      subtitle={t("objectives.subtitle")}
    >
      <OkrTabs
        objectives={objectives}
        roadmapItems={roadmapItems}
        projects={projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug, color: p.color ?? "#888" }))}
      />
    </PageHeader>
  );
}
