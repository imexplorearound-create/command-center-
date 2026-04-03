import Link from "next/link";
import { healthColor, healthLabel } from "@/lib/utils";
import type { ProjectData } from "@/lib/types";

export function ProjectCard(p: ProjectData) {
  return (
    <Link href={`/project/${p.slug}`} className="cc-card cc-project-card">
      <div className="cc-project-header">
        <div className="cc-project-name">
          <div className="cc-project-dot" style={{ backgroundColor: p.color }} />
          {p.name}
        </div>
        <span className="cc-project-type">{p.type}</span>
      </div>

      {p.activePhase && (
        <div className="cc-project-phase">
          Fase: <span style={{ color: "var(--text)" }}>{p.activePhase}</span>
        </div>
      )}

      <div className="cc-project-progress">
        <span>Progresso</span>
        <span>{p.progress}%</span>
      </div>
      <div className="cc-progress-bar">
        <div
          className="cc-progress-fill"
          style={{ width: `${p.progress}%`, backgroundColor: p.color }}
        />
      </div>

      <div className="cc-project-footer">
        <span className="cc-muted">
          {p.activeTasks} tarefa{p.activeTasks !== 1 ? "s" : ""} ativa{p.activeTasks !== 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {p.overdueTasks > 0 && (
            <span className="cc-red" style={{ fontWeight: 500 }}>
              {p.overdueTasks} atrasada{p.overdueTasks !== 1 ? "s" : ""}
            </span>
          )}
          <span className="cc-health" style={{ color: healthColor(p.health) }}>
            ● {healthLabel(p.health)}
          </span>
        </div>
      </div>
    </Link>
  );
}
