import type { StatsData } from "@/lib/types";

export function StatsRow(stats: StatsData) {
  return (
    <div className="cc-stats">
      <div className="cc-card cc-stat">
        <div className="cc-stat-value">{stats.totalTasks}</div>
        <div className="cc-stat-label">Tarefas Activas</div>
      </div>
      <div className="cc-card cc-stat">
        <div className="cc-stat-value" style={{ color: stats.overdueTasks > 0 ? "var(--red)" : "var(--green)" }}>
          {stats.overdueTasks}
        </div>
        <div className="cc-stat-label">Atrasadas</div>
      </div>
      <div className="cc-card cc-stat">
        <div className="cc-stat-value" style={{ color: "var(--green)" }}>{stats.completedTasks}</div>
        <div className="cc-stat-label">Concluídas</div>
      </div>
      <div className="cc-card cc-stat">
        <div className="cc-stat-value" style={{ color: "var(--accent)" }}>{stats.activeProjects}</div>
        <div className="cc-stat-label">Projectos</div>
      </div>
    </div>
  );
}
