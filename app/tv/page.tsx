import { CrewColumn } from "@/components/dashboard-v1/CrewColumn";
import { Hero } from "@/components/dashboard-v1/Hero";
import { Feed } from "@/components/dashboard-v1/Feed";
import { MetricsStrip } from "@/components/dashboard-v1/MetricsStrip";
import { ProjectsStrip } from "@/components/dashboard-v1/ProjectsStrip";
import { DecisionsColumn } from "@/components/dashboard-v1/DecisionsColumn";
import { AlertsPassive } from "@/components/dashboard-v1/AlertsPassive";
import {
  getCrew,
  getAutonomy7d,
  getProjects,
  getProjectsAtRisk,
  getOpenDecisions,
  getPendingFeedback,
  getDevVelocity,
  getPipelineValue,
  getPassiveAlerts,
  getFeedEvents,
} from "@/lib/queries";
import { buildHeroSignals } from "@/lib/dashboard-helpers";
import { getAuthUser } from "@/lib/auth/dal";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TvPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const [
    crew,
    autonomy,
    projects,
    projectsAtRisk,
    decisions,
    pendingFeedback,
    devVelocity,
    pipelineValue,
    alerts,
    feedEvents,
  ] = await Promise.all([
    getCrew(),
    getAutonomy7d(),
    getProjects(user),
    getProjectsAtRisk(),
    getOpenDecisions(),
    getPendingFeedback(),
    getDevVelocity(),
    getPipelineValue(),
    getPassiveAlerts(),
    getFeedEvents(90),
  ]);

  const activeProjects = projects.filter((p) => p.status === "ativo").slice(0, 10);
  const firstName = user.name.split(" ")[0] ?? user.name;
  const heroSignals = buildHeroSignals({
    userName: firstName,
    decisions,
    projectsAtRiskCount: projectsAtRisk.length,
  });

  return (
    <div
      className="portiqa-theme tv"
      data-theme="dark"
      style={{
        display: "grid",
        gridTemplateColumns: "280px minmax(0, 1fr) 380px",
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      <CrewColumn crew={crew} autonomy={autonomy} readOnly />

      <main style={{ padding: "8px 32px 32px", overflow: "auto" }}>
        <Hero signals={heroSignals} readOnly />
        <MetricsStrip
          projectsAtRisk={projectsAtRisk.length}
          openDecisions={decisions.length}
          pendingFeedback={pendingFeedback}
          devVelocity={devVelocity}
          pipelineValue={pipelineValue}
        />
        <Feed events={feedEvents} />
        <ProjectsStrip projects={activeProjects} />
      </main>

      <aside
        style={{
          borderLeft: "1px solid var(--line)",
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DecisionsColumn decisions={decisions} readOnly />
        <AlertsPassive alerts={alerts} />
      </aside>
    </div>
  );
}
