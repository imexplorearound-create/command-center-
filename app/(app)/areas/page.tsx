import { requireNonClient, isAdmin } from "@/lib/auth/dal";
import { getAreas, getKanbanOptions } from "@/lib/queries";
import { AreasList } from "@/components/areas/areas-list";
import { NewAreaButton } from "@/components/areas/new-area-button";
import { getServerT } from "@/lib/i18n/server";

export default async function AreasPage() {
  const user = await requireNonClient();
  const t = await getServerT();
  const [areas, options] = await Promise.all([getAreas(), getKanbanOptions()]);
  const canEdit = isAdmin(user);

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div className="cc-page-title">{t("areas.title")}</div>
        {canEdit && <NewAreaButton people={options.people} />}
      </div>
      {!canEdit && (
        <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 12 }}>
          {t("common.readonly_admins_only")}
        </div>
      )}
      <AreasList areas={areas} people={options.people} canEdit={canEdit} />
    </>
  );
}
