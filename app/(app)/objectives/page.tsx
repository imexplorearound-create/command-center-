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
    <div className="portiqa-theme" style={{ minHeight: "100%", padding: "28px 32px" }}>
      <header style={{ marginBottom: 24 }}>
        <div className="kicker" style={{ marginBottom: 8 }}>Objectivos · OKRs</div>
        <h1 className="h1">{t("objectives.title")}</h1>
        <p className="lede" style={{ marginTop: 8 }}>{t("objectives.subtitle")}</p>
      </header>

      <OkrTabs
        objectives={objectives}
        roadmapItems={roadmapItems}
        projects={projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug, color: p.color ?? "#888" }))}
      />
    </div>
  );
}
