import { getOkrObjectives, getRoadmapItems } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth/dal";
import { getTenantDb } from "@/lib/tenant";
import { OkrTabs } from "./okr-tabs";
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
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">{t("objectives.title")}</div>
        <div className="cc-page-subtitle">{t("objectives.subtitle")}</div>
      </div>

      <OkrTabs
        objectives={objectives}
        roadmapItems={roadmapItems}
        projects={projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug, color: p.color ?? "#888" }))}
      />
    </>
  );
}
