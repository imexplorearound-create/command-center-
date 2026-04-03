import { Phone, Video, MessageSquare, Calendar, GitBranch, type LucideIcon } from "lucide-react";
import { ProjectCard } from "@/components/dashboard/project-card";
import { ObjectivesBar } from "@/components/dashboard/objectives-bar";
import { SatelliteCard } from "@/components/dashboard/satellite-card";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { ValidationPanel } from "@/components/dashboard/validation-panel";
import { StatsRow } from "@/components/dashboard/stats-row";
import { getProjects, getObjectives, getAlerts, getStats, getSatellites } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth/dal";
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
  const [projects, objectives, alerts, stats, satellites] = await Promise.all([
    getProjects(user),
    getObjectives(user),
    getAlerts(user),
    getStats(user),
    getSatellites(),
  ]);

  return (
    <>
      <StatsRow {...stats} />

      <div className="cc-section-title">📁 Projectos</div>
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

      <ValidationPanel />

      <AlertsPanel alerts={alerts} />
    </>
  );
}
