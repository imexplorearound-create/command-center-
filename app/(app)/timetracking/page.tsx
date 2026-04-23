import { getAuthUser } from "@/lib/auth/dal";
import {
  getWeekSummary,
  getTeamTimeEntries,
  getTimetrackingOptions,
} from "@/lib/queries/timetracking-queries";
import { WeekView } from "@/components/timetracking/week-view";
import { SubmitBar } from "@/components/timetracking/submit-bar";
import { ApprovalView } from "@/components/timetracking/approval-view";
import { redirect } from "next/navigation";
import { getWeekBounds } from "@/lib/utils";
import { ExportButton } from "@/components/shared/export-button";
import { getServerT } from "@/lib/i18n/server";

export default async function TimetrackingPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const t = await getServerT();

  // Current week boundaries (Monday to Sunday)
  const { monday, sunday } = getWeekBounds();

  const isManager = user.role === "admin" || user.role === "manager";

  const [summary, options, teamEntries] = await Promise.all([
    getWeekSummary(user.personId, monday, sunday),
    getTimetrackingOptions(),
    isManager
      ? getTeamTimeEntries(monday, sunday, "submitted")
      : Promise.resolve([]),
  ]);

  const draftEntries = summary.days
    .flatMap((d) => d.entries)
    .filter((e) => e.status === "draft");

  return (
    <>
      <div className="cc-page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="cc-page-title">{t("timetracking.title")}</div>
            <div className="cc-page-subtitle">
              {t("timetracking.subtitle", {
                hours: Math.floor(summary.weekTotal / 60),
                minutes: summary.weekTotal % 60,
                contracted: summary.contractedHours,
              })}
            </div>
          </div>
          <ExportButton
            type="timesheets"
            dateFrom={monday.toISOString().split("T")[0]}
            dateTo={sunday.toISOString().split("T")[0]}
          />
        </div>
      </div>

      <WeekView
        summary={summary}
        projects={options.projects}
        tasks={options.tasks}
      />

      {draftEntries.length > 0 && (
        <SubmitBar
          draftCount={draftEntries.length}
          draftIds={draftEntries.map((e) => e.id)}
        />
      )}

      {isManager && teamEntries.length > 0 && (
        <>
          <div className="cc-section-title" style={{ marginTop: 32 }}>
            {t("timetracking.approvals_pending")}
          </div>
          <ApprovalView entries={teamEntries} />
        </>
      )}
    </>
  );
}
