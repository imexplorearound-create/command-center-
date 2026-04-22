import { CrewColumn } from "@/components/dashboard-v1/CrewColumn";
import { Hero } from "@/components/dashboard-v1/Hero";
import { Feed } from "@/components/dashboard-v1/Feed";
import { ProjectsStrip } from "@/components/dashboard-v1/ProjectsStrip";
import { DecisionsColumn } from "@/components/dashboard-v1/DecisionsColumn";
import { AlertsPassive } from "@/components/dashboard-v1/AlertsPassive";
import { TvCard } from "@/components/dashboard-v1/TvCard";
import {
  getCrew,
  getAutonomy7d,
  getProjects,
  getOpenDecisions,
  getPassiveAlerts,
  getFeedEvents,
} from "@/lib/queries";
import { getAuthUser } from "@/lib/auth/dal";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const [crew, autonomy, projects, decisions, alerts, feedEvents] = await Promise.all([
    getCrew(),
    getAutonomy7d(),
    getProjects(user),
    getOpenDecisions(),
    getPassiveAlerts(),
    getFeedEvents(90),
  ]);

  const activeProjects = projects.filter((p) => p.status === "ativo").slice(0, 10);
  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <div
      className="portiqa-theme"
      data-theme="dark"
      style={{
        display: "grid",
        gridTemplateColumns: "280px minmax(0, 1fr) 380px",
        minHeight: "calc(100vh - 54px)",
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      <CrewColumn crew={crew} autonomy={autonomy} />

      <main style={{ padding: "8px 32px 32px", overflow: "auto" }}>
        <Hero userName={firstName} openDecisionsCount={decisions.length} />
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
        <DecisionsColumn decisions={decisions} />
        <AlertsPassive alerts={alerts} />
        <TvCard />
      </aside>
    </div>
  );
}
