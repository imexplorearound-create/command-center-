"use client";

import { useState } from "react";
import Link from "next/link";
import { healthLabel, healthColor, formatMonth, formatDate, timeAgo, progressColor } from "@/lib/utils";
import type { ProjectDetail, GithubPR, DevMetrics, PersonOption, AreaOption } from "@/lib/types";
import { EditProjectButton } from "@/components/projects/edit-project-button";
import { ArchiveProjectButton } from "@/components/projects/archive-project-button";
import { PhaseListEditable } from "@/components/phases/phase-list-editable";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskFilters } from "@/components/kanban/task-filters";
import type { ProjectStatus } from "@/lib/validation/project-schema";

type TabKey = "kanban" | "timeline" | "dev";

interface ProjectViewProps {
  project: ProjectDetail;
  slug: string;
  canEdit?: boolean;
  canWrite?: boolean;
  initialTab?: TabKey;
  people: PersonOption[];
  areas: AreaOption[];
  filters: { assignee?: string; priority?: string; origin?: string };
  origins: string[];
}

export function ProjectView({
  project,
  slug,
  canEdit = false,
  canWrite = false,
  initialTab = "kanban",
  people,
  areas,
  filters,
  origins,
}: ProjectViewProps) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const hasFilters = !!(filters.assignee || filters.priority || filters.origin);

  const hColor = healthColor(project.health);

  return (
    <>
      <div className="cc-proj-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="cc-proj-dot" style={{ backgroundColor: project.color }} />
        <div className="cc-page-title" style={{ flex: 1 }}>{project.name}</div>
        {canEdit && (
          <div style={{ display: "flex", gap: 6 }}>
            <EditProjectButton
              project={{
                slug: project.slug,
                name: project.name,
                type: project.type,
                status: project.status as ProjectStatus,
                health: project.health,
                progress: project.progress,
                description: project.description,
                color: project.color,
              }}
            />
            <ArchiveProjectButton slug={project.slug} projectName={project.name} />
          </div>
        )}
      </div>

      <div className="cc-proj-info">
        <div className="cc-proj-info-item">
          <span style={{ color: hColor }}>●</span>
          {healthLabel(project.health)}
        </div>
        <div className="cc-proj-info-item">{project.type}</div>
        {project.activePhase && (
          <div className="cc-proj-info-item">Fase: <strong style={{ color: "var(--text)", marginLeft: 4 }}>{project.activePhase}</strong></div>
        )}
        <div className="cc-proj-info-item">{project.tasks.length} tarefas</div>
        {project.overdueTasks > 0 && (
          <div className="cc-proj-info-item" style={{ color: "var(--red)" }}>{project.overdueTasks} atrasada(s)</div>
        )}
      </div>

      <div className="cc-card" style={{ marginBottom: 24, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 6 }}>
          <span className="cc-muted">Progresso geral</span>
          <span style={{ fontWeight: 600 }}>{project.progress}%</span>
        </div>
        <div className="cc-progress-bar" style={{ height: 10 }}>
          <div className="cc-progress-fill" style={{ width: `${project.progress}%`, backgroundColor: project.color }} />
        </div>
      </div>

      <div className="cc-tabs">
        <button className={`cc-tab ${tab === "kanban" ? "active" : ""}`} onClick={() => setTab("kanban")}>📋 Kanban</button>
        {(project.phases.length > 0 || canEdit) && (
          <button className={`cc-tab ${tab === "timeline" ? "active" : ""}`} onClick={() => setTab("timeline")}>📅 Timeline</button>
        )}
        {project.github && (
          <button className={`cc-tab ${tab === "dev" ? "active" : ""}`} onClick={() => setTab("dev")}>💻 Dev</button>
        )}
        {project.client && (
          <Link href={`/project/${slug}/client`} className="cc-tab" style={{ textDecoration: "none" }}>👥 Cliente</Link>
        )}
        {canEdit && (
          <Link href={`/project/${slug}/tester-setup`} className="cc-tab" style={{ textDecoration: "none" }}>🎤 Tester</Link>
        )}
      </div>

      {tab === "kanban" && (
        <>
          <TaskFilters
            basePath={`/project/${slug}`}
            currentTab="kanban"
            people={people}
            selected={filters}
            origins={origins}
          />
          {hasFilters && (
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--muted, #999)",
                marginBottom: 8,
                fontStyle: "italic",
              }}
            >
              ⓘ Drag &amp; drop desactivado quando há filtros activos.
            </div>
          )}
          <KanbanBoard
            tasks={project.tasks}
            projectId={project.id}
            projectSlug={slug}
            phases={project.phases}
            people={people}
            areas={areas}
            canWrite={canWrite && !hasFilters}
          />
        </>
      )}

      {tab === "timeline" && (
        <>
          {project.phases.length > 0 && (
            <div className="cc-card" style={{ padding: 24, overflowX: "auto", marginBottom: 16 }}>
              <div className="cc-timeline">
                {project.phases.map((phase, i) => (
                  <span key={phase.id} style={{ display: "contents" }}>
                    <div className="cc-phase-node">
                      <div className={`cc-phase-circle cc-phase-${phase.status === "em_curso" ? "active" : phase.status === "concluida" ? "done" : "pending"}`}>
                        {phase.status === "concluida" ? "✓" : phase.status === "em_curso" ? phase.progress + "%" : i + 1}
                      </div>
                      <div className={`cc-phase-name ${phase.status === "em_curso" ? "active-name" : ""}`}>{phase.name}</div>
                      <div className="cc-phase-dates">{formatMonth(phase.startDate)} — {formatMonth(phase.endDate)}</div>
                    </div>
                    {i < project.phases.length - 1 && (
                      <div className={`cc-phase-line ${phase.status === "concluida" ? "cc-phase-line-done" : "cc-phase-line-pending"}`} />
                    )}
                  </span>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.8rem", color: "var(--muted)" }}>
                📍 Hoje: {formatDate(new Date())}
              </div>
            </div>
          )}
          <div className="cc-card" style={{ padding: 16 }}>
            <PhaseListEditable
              projectSlug={slug}
              phases={project.phases.map((p) => ({
                id: p.id,
                name: p.name,
                status: p.status,
                progress: p.progress,
                startDate: p.startDate || undefined,
                endDate: p.endDate || undefined,
              }))}
              canEdit={canEdit}
            />
          </div>
        </>
      )}

      {tab === "dev" && project.github && <DevTab github={project.github} repo={project.repo} />}
    </>
  );
}

// ─── Dev Tab ────────────────────────────────────────────────

function DevTab({ github, repo }: { github: NonNullable<ProjectDetail["github"]>; repo?: string }) {
  const { prs, commits, deploys, metrics } = github;
  const maxActivity = Math.max(...metrics.activityByWeek, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Metrics row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <MetricCard label="Commits" value={metrics.commitsThisMonth} sub="este mês" />
        <MetricCard label="PRs abertas" value={metrics.prsOpen} />
        <MetricCard label="PRs merged" value={metrics.prsMerged} sub="este mês" />
        <MetricCard label="Deploys" value={metrics.deploysSuccess} color="var(--green)" />
        {metrics.deploysFailed > 0 && (
          <MetricCard label="Deploys falhados" value={metrics.deploysFailed} color="var(--red)" />
        )}
      </div>

      {/* Activity chart (simple bar chart) */}
      <div className="cc-card" style={{ padding: 16 }}>
        <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 12 }}>Actividade (4 semanas)</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 60 }}>
          {metrics.activityByWeek.map((val, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: "100%",
                  height: Math.max(4, (val / maxActivity) * 48),
                  background: progressColor(val > 0 ? 80 : 0),
                  borderRadius: 3,
                  transition: "height 0.3s",
                }}
              />
              <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>S{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PRs */}
      {prs.length > 0 && (
        <div className="cc-card" style={{ padding: 16 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 12 }}>Pull Requests</div>
          {prs.map((pr) => (
            <PrRow key={pr.number} pr={pr} />
          ))}
        </div>
      )}

      {/* Recent commits */}
      {commits.length > 0 && (
        <div className="cc-card" style={{ padding: 16 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 12 }}>Commits recentes</div>
          {commits.slice(0, 10).map((c) => (
            <div key={c.sha} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", gap: 8, minWidth: 0, flex: 1 }}>
                <code style={{ color: "var(--accent)", fontSize: "0.75rem", flexShrink: 0 }}>{c.sha.slice(0, 7)}</code>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.message}</span>
              </div>
              <div style={{ display: "flex", gap: 12, flexShrink: 0, color: "var(--muted)", fontSize: "0.78rem" }}>
                <span>@{c.author}</span>
                <span>{timeAgo(c.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deploys */}
      {deploys.length > 0 && (
        <div className="cc-card" style={{ padding: 16 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 12 }}>Deploys</div>
          {deploys.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span>{d.status === "success" ? "🟢" : "🔴"}</span>
                <span>{d.branch}</span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                @{d.author} · {timeAgo(d.date)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {prs.length === 0 && commits.length === 0 && (
        <div className="cc-card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>💻</div>
          <div>Sem dados de desenvolvimento</div>
          <div style={{ fontSize: "0.8rem", marginTop: 4 }}>
            {repo ? `Repo: ${repo}` : "Nenhum repositório configurado"}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div className="cc-card" style={{ padding: "12px 14px", textAlign: "center" }}>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: color ?? "var(--text)" }}>{value}</div>
      <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{label}</div>
      {sub && <div style={{ fontSize: "0.7rem", color: "var(--muted)", opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

const PR_STATUS_COLORS: Record<string, { color: string; label: string }> = {
  open: { color: "var(--green)", label: "Open" },
  draft: { color: "var(--muted)", label: "Draft" },
  merged: { color: "var(--accent)", label: "Merged" },
  closed: { color: "var(--red)", label: "Closed" },
};

function PrRow({ pr }: { pr: GithubPR }) {
  const cfg = PR_STATUS_COLORS[pr.status] ?? PR_STATUS_COLORS.open;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.82rem" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0, flex: 1 }}>
        <span style={{ color: cfg.color, fontWeight: 600, fontSize: "0.75rem", flexShrink: 0 }}>#{pr.number}</span>
        {pr.url ? (
          <a href={pr.url} target="_blank" rel="noopener" style={{ color: "var(--text)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {pr.title}
          </a>
        ) : (
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pr.title}</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, flexShrink: 0, alignItems: "center" }}>
        <span style={{ color: cfg.color, fontSize: "0.75rem", padding: "2px 6px", borderRadius: 4, background: `${cfg.color}15` }}>{cfg.label}</span>
        <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>@{pr.author}</span>
        <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{timeAgo(pr.openedAt)}</span>
      </div>
    </div>
  );
}

