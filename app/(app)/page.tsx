import { Phone, Video, MessageSquare, Calendar, GitBranch, type LucideIcon } from "lucide-react";
import { ProjectCard } from "@/components/dashboard/project-card";
import { ObjectivesBar } from "@/components/dashboard/objectives-bar";
import { SatelliteCard } from "@/components/dashboard/satellite-card";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { ValidationPanel } from "@/components/dashboard/validation-panel";
import { StatsRow } from "@/components/dashboard/stats-row";
import { PipelineWidget } from "@/components/dashboard/pipeline-widget";
import { TimetrackingWidget } from "@/components/dashboard/timetracking-widget";
import { NewProjectButton } from "@/components/projects/new-project-button";
import { CrmSummaryCard } from "@/components/dashboard/crm-summary-card";
import { TimetrackingSummaryCard } from "@/components/dashboard/timetracking-summary-card";
import { EmailSummaryCard } from "@/components/dashboard/email-summary-card";
import { InvestmentSummaryCard } from "@/components/dashboard/investment-summary-card";
import { getProjects, getObjectives, getAlerts, getStats, getSatellites } from "@/lib/queries";
import { getCrmPipelineStats } from "@/lib/queries/crm-queries";
import { getWeekSummary } from "@/lib/queries/timetracking-queries";
import { getAuthUser } from "@/lib/auth/dal";
import { getTenantDb } from "@/lib/tenant";
import { getServerT } from "@/lib/i18n/server";
import { getWeekBounds } from "@/lib/utils";
import type { SatelliteData } from "@/lib/types";

const satelliteConfig: { key: string; icon: LucideIcon; color: string }[] = [
  { key: "calls", icon: Phone, color: "#3b82f6" },
  { key: "content", icon: Video, color: "#f97316" },
  { key: "discord", icon: MessageSquare, color: "#8b5cf6" },
  { key: "calendar", icon: Calendar, color: "#22c55e" },
  { key: "github", icon: GitBranch, color: "#f0f0f0" },
];

export default async function DashboardPage() {
  const user = await getAuthUser();
  const t = await getServerT();

  // Check which modules are enabled for this tenant
  const db = await getTenantDb();
  const enabledModules = await db.tenantModuleConfig.findMany({
    where: { isEnabled: true },
    select: { moduleKey: true },
  });
  const moduleKeys = new Set(enabledModules.map((m) => m.moduleKey));

  // Compute current week boundaries (Monday–Sunday)
  const { monday, sunday } = getWeekBounds();

  const [projects, objectives, alerts, stats, satellites, crmStats, weekSummary] =
    await Promise.all([
      getProjects(user),
      getObjectives(user),
      getAlerts(user),
      getStats(user),
      getSatellites(),
      moduleKeys.has("crm") ? getCrmPipelineStats() : null,
      moduleKeys.has("timetracking") && user?.personId
        ? getWeekSummary(user.personId, monday, sunday)
        : null,
    ]);

  return (
    <>
      <StatsRow {...stats} />

      <div
        className="cc-section-title"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <span>📁 Projectos</span>
        {user?.role === "admin" && <NewProjectButton />}
      </div>
      <div className="cc-projects">
        {projects.map((project) => (
          <ProjectCard key={project.id} {...project} />
        ))}
      </div>

      <ObjectivesBar objectives={objectives} />

      <div className="cc-section-title">📡 Fontes de dados</div>
      <div className="cc-satellites" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {satelliteConfig.map(({ key, icon, color }) => (
          <SatelliteCard key={key} icon={icon} color={color} {...(satellites as Record<string, SatelliteData>)[key]} />
        ))}
      </div>

      {/* Module summary cards */}
      {(moduleKeys.has("crm") || moduleKeys.has("timetracking") || moduleKeys.has("email-sync") || moduleKeys.has("cross-projects")) && (
        <>
          <div className="cc-section-title">{t("dashboard.modules")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
            {moduleKeys.has("crm") && <CrmSummaryCard />}
            {moduleKeys.has("timetracking") && <TimetrackingSummaryCard />}
            {moduleKeys.has("email-sync") && <EmailSummaryCard />}
            {moduleKeys.has("cross-projects") && <InvestmentSummaryCard />}
          </div>
        </>
      )}

      {crmStats && <PipelineWidget stats={crmStats} />}
      {weekSummary && (
        <TimetrackingWidget
          weekTotal={weekSummary.weekTotal}
          contractedHours={weekSummary.contractedHours}
          billableMinutes={weekSummary.billableMinutes}
        />
      )}

      <ValidationPanel />

      <AlertsPanel alerts={alerts} />
    </>
  );
}
