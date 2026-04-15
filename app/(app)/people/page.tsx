import { requireNonClient, isAdmin } from "@/lib/auth/dal";
import { getPeople } from "@/lib/queries";
import { PeopleList } from "@/components/people/people-list";
import { NewPersonButton } from "@/components/people/new-person-button";
import { ExportButton } from "@/components/shared/export-button";
import { getServerT } from "@/lib/i18n/server";

export default async function PeoplePage() {
  const user = await requireNonClient();
  const t = await getServerT();
  const grouped = await getPeople();
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
        <div className="cc-page-title">{t("people.title")}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton type="people" formats={["excel"]} />
          {canEdit && <NewPersonButton />}
        </div>
      </div>
      {!canEdit && (
        <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 12 }}>
          {t("common.readonly_admins_only")}
        </div>
      )}
      <PeopleList grouped={grouped} canEdit={canEdit} />
    </>
  );
}
