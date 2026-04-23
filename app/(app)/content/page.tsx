import { getContentItems, getProjectsForContentSelect } from "@/lib/queries";
import { ContentPipeline } from "./content-pipeline";
import { getServerT } from "@/lib/i18n/server";

export default async function ContentPage() {
  const t = await getServerT();
  const [items, projects] = await Promise.all([
    getContentItems(),
    getProjectsForContentSelect(),
  ]);

  return (
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">🎬 {t("content.title")}</div>
        <div className="cc-page-subtitle">{t("content.subtitle")}</div>
      </div>

      <ContentPipeline items={items} projects={projects} />
    </>
  );
}
