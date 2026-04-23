import { getEmailRecords, getUnprocessedEmailCount } from "@/lib/queries/email-queries";
import { getCrmOptions } from "@/lib/queries/crm-queries";
import { getTenantDb } from "@/lib/tenant";
import { EmailListView } from "@/components/email-sync/email-list-view";
import { getServerT } from "@/lib/i18n/server";

export default async function EmailSyncPage() {
  const t = await getServerT();
  const db = await getTenantDb();
  const [emails, unprocessedCount, { people }, projects, clients] = await Promise.all([
    getEmailRecords(),
    getUnprocessedEmailCount(),
    getCrmOptions(),
    db.project.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.client.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
  ]);

  return (
    <>
      <div className="cc-page-header">
        <div className="cc-page-title">{t("emails.title")}</div>
        <div className="cc-page-subtitle">
          {t("emails.subtitle", { count: emails.length })}
          {unprocessedCount > 0 && ` \u00b7 ${t("emails.pending", { count: unprocessedCount })}`}
        </div>
      </div>
      <EmailListView
        emails={emails}
        projects={projects}
        clients={clients}
        people={people}
      />
    </>
  );
}
