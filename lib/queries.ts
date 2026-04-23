import { getTenantDb } from "./tenant";
import type { Prisma } from "@prisma/client";
import type { AuthUser } from "./auth/dal";
import type {
  ProjectData,
  ObjectiveData,
  AlertData,
  StatsData,
  SatelliteData,
  ProjectDetail,
  WorkflowTemplateData,
  WorkflowInstanceData,
  ValidationItem,
  TrustScoreData,
  ContentItemData,
  Health,
  TaskData,
  PhaseData,
  ClientData,
  GithubPR,
  GithubCommit,
  GithubDeploy,
  DevMetrics,
  OkrObjectiveData,
  KeyResultData,
  RoadmapItem,
  OkrSnapshotData,
  PersonOption,
  AreaOption,
} from "./types";

// ─── Kanban / Form options ──────────────────────────────────

export async function getKanbanOptions(): Promise<{
  people: PersonOption[];
  areas: AreaOption[];
}> {
  const db = await getTenantDb();
  const [people, areas] = await Promise.all([
    db.person.findMany({
      where: { type: "equipa", archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, avatarColor: true },
    }),
    db.area.findMany({
      where: { status: "ativo", archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return {
    people: people.map((p) => ({
      id: p.id,
      name: p.name,
      avatarColor: p.avatarColor ?? "#888",
    })),
    areas: areas.map((a) => ({
      id: a.id,
      name: a.name,
      color: a.color ?? "#888",
    })),
  };
}

// ─── People (lista admin) ───────────────────────────────────

export interface PersonRow {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  type: string;
  avatarColor: string;
  githubUsername: string | null;
  archivedAt: Date | null;
  activeTaskCount: number;
}

export interface PeopleProjectGroup {
  project: { id: string; name: string; slug: string; color: string };
  people: PersonRow[];
}

export interface GroupedPeople {
  internas: PersonRow[];
  porProjeto: PeopleProjectGroup[];
  semProjeto: PersonRow[];
}

export async function getPeople(): Promise<GroupedPeople> {
  const db = await getTenantDb();
  const people = await db.person.findMany({
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      type: true,
      avatarColor: true,
      githubUsername: true,
      archivedAt: true,
      _count: {
        select: {
          tasks: { where: { archivedAt: null, status: { not: "feito" } } },
        },
      },
      clientContacts: {
        select: {
          client: {
            select: {
              project: {
                select: { id: true, name: true, slug: true, color: true },
              },
            },
          },
        },
      },
    },
  });

  const internas: PersonRow[] = [];
  const semProjeto: PersonRow[] = [];
  const projectMap = new Map<string, PeopleProjectGroup>();

  for (const p of people) {
    const row: PersonRow = {
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      type: p.type,
      avatarColor: p.avatarColor ?? "#888",
      githubUsername: p.githubUsername,
      archivedAt: p.archivedAt,
      activeTaskCount: p._count.tasks,
    };

    if (p.type === "equipa") {
      internas.push(row);
      continue;
    }

    const projects = p.clientContacts.map((cc) => cc.client.project);
    if (projects.length === 0) {
      semProjeto.push(row);
      continue;
    }

    const seen = new Set<string>();
    for (const proj of projects) {
      if (seen.has(proj.id)) continue;
      seen.add(proj.id);

      let bucket = projectMap.get(proj.id);
      if (!bucket) {
        bucket = {
          project: {
            id: proj.id,
            name: proj.name,
            slug: proj.slug,
            color: proj.color ?? "#888",
          },
          people: [],
        };
        projectMap.set(proj.id, bucket);
      }
      bucket.people.push(row);
    }
  }

  const porProjeto = Array.from(projectMap.values()).sort((a, b) =>
    a.project.name.localeCompare(b.project.name)
  );

  return { internas, porProjeto, semProjeto };
}

// ─── Areas (lista admin) ────────────────────────────────────

export interface AreaRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string | null;
  ownerName: string | null;
  ownerId: string | null;
  archivedAt: Date | null;
  taskCount: number;
  workflowTemplateCount: number;
}

export async function getAreas(): Promise<AreaRow[]> {
  const db = await getTenantDb();
  const areas = await db.area.findMany({
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      color: true,
      icon: true,
      ownerId: true,
      archivedAt: true,
      owner: { select: { name: true } },
      _count: {
        select: {
          tasks: { where: { archivedAt: null } },
          workflowTemplates: true,
        },
      },
    },
  });

  return areas.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    description: a.description,
    color: a.color ?? "#888",
    icon: a.icon,
    ownerName: a.owner?.name ?? null,
    ownerId: a.ownerId,
    archivedAt: a.archivedAt,
    taskCount: a._count.tasks,
    workflowTemplateCount: a._count.workflowTemplates,
  }));
}

// ─── Helpers ────────────────────────────────────────────────

function computeHealth(progress: number, deadline?: Date | null): Health {
  if (!deadline) return "green";
  const now = new Date();
  const total = deadline.getTime() - now.getTime();
  const daysLeft = total / (1000 * 60 * 60 * 24);
  if (progress >= 80 || daysLeft > 60) return "green";
  if (progress >= 40 || daysLeft > 14) return "yellow";
  return "red";
}

function toDateStr(d: Date | null | undefined): string {
  return d ? d.toISOString().split("T")[0] : "";
}

/**
 * Filtro reutilizável: exclui projectos arquivados (soft delete via archivedAt).
 * Aplicar EXPLICITAMENTE nas queries que listam projectos. NÃO meter no
 * projectFilter() porque ele é usado em relações nested (`{project: pFilter}`)
 * onde adicionar archivedAt:null excluiria entidades com projectId=null.
 * Excepção: getProjectBySlug deixa passar arquivados para URLs directas continuarem a funcionar.
 */
export const NOT_ARCHIVED: Prisma.ProjectWhereInput = { archivedAt: null };
export const NOT_ARCHIVED_FEEDBACK_ITEM: Prisma.FeedbackItemWhereInput = { archivedAt: null };

function projectFilter(user?: AuthUser | null): Prisma.ProjectWhereInput {
  if (!user || user.role === "admin") return {};
  if (user.role === "membro") {
    return { id: { in: user.projectIds } };
  }
  // cliente: projects linked through ClientContact → Person
  return { client: { contacts: { some: { personId: user.personId } } } };
}

// ─── Dashboard ──────────────────────────────────────────────

export async function getProjects(user?: AuthUser | null): Promise<ProjectData[]> {
  const db = await getTenantDb();
  const projects = await db.project.findMany({
    where: { ...NOT_ARCHIVED, ...projectFilter(user) },
    include: {
      phases: { where: { status: "em_curso" }, take: 1 },
      tasks: { where: { archivedAt: null }, select: { status: true, deadline: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return projects.map((p) => {
    const now = new Date();
    const activeTasks = p.tasks.filter((t) => t.status !== "feito").length;
    const overdueTasks = p.tasks.filter(
      (t) => t.deadline && t.deadline < now && t.status !== "feito"
    ).length;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      type: p.type as ProjectData["type"],
      status: p.status,
      health: p.health as Health,
      progress: p.progress,
      color: p.color ?? "#888",
      description: p.description ?? "",
      activeTasks,
      overdueTasks,
      activePhase: p.phases[0]?.name,
    };
  });
}

export async function getObjectives(user?: AuthUser | null): Promise<ObjectiveData[]> {
  const db = await getTenantDb();
  const pFilter = projectFilter(user);
  const hasFilter = Object.keys(pFilter).length > 0;
  const objectives = await db.objective.findMany({
    where: hasFilter ? { OR: [{ projectId: null }, { project: pFilter }] } : undefined,
    include: {
      project: { select: { name: true, color: true, tasks: { where: { archivedAt: null }, select: { id: true, title: true, status: true, assignee: { select: { name: true } } }, take: 5 } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return objectives.map((o) => {
    const target = Number(o.targetValue ?? 0);
    const current = Number(o.currentValue);
    return {
      id: o.id,
      title: o.title,
      targetValue: target,
      currentValue: current,
      unit: o.unit ?? "",
      deadline: toDateStr(o.deadline),
      project: o.project?.name,
      projectColor: o.project?.color ?? undefined,
      health: computeHealth(target > 0 ? (current / target) * 100 : 0, o.deadline),
      relatedTasks: o.project?.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status as TaskData["status"],
        assignee: t.assignee?.name ?? "—",
      })),
    };
  });
}

export async function getAlerts(user?: AuthUser | null): Promise<AlertData[]> {
  const db = await getTenantDb();
  const pFilter = projectFilter(user);
  const hasFilter = Object.keys(pFilter).length > 0;
  const alerts = await db.alert.findMany({
    where: {
      isDismissed: false,
      ...(hasFilter ? { project: pFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return alerts.map((a) => ({
    id: a.id,
    type: a.type as AlertData["type"],
    severity: a.severity as AlertData["severity"],
    title: a.title,
    description: a.description ?? undefined,
  }));
}

export async function getStats(user?: AuthUser | null): Promise<StatsData> {
  const db = await getTenantDb();
  const pFilter = projectFilter(user);
  const hasFilter = Object.keys(pFilter).length > 0;
  const baseTaskWhere: Prisma.TaskWhereInput = hasFilter ? { project: pFilter } : {};
  const taskWhere: Prisma.TaskWhereInput = { ...baseTaskWhere, archivedAt: null };

  const [totalTasks, overdueTasks, completedTasks, activeProjects] =
    await Promise.all([
      db.task.count({ where: taskWhere }),
      db.task.count({
        where: {
          ...taskWhere,
          deadline: { lt: new Date() },
          status: { not: "feito" },
        },
      }),
      db.task.count({ where: { ...taskWhere, status: "feito" } }),
      db.project.count({ where: { status: "ativo", ...NOT_ARCHIVED, ...pFilter } }),
    ]);

  return { totalTasks, overdueTasks, completedTasks, activeProjects };
}

export async function getSatellites(): Promise<Record<string, SatelliteData>> {
  const db = await getTenantDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [contentCount, callsCount, discordCount, githubCommits, githubPrsOpen] =
    await Promise.all([
      db.contentItem.count({ where: { status: "pronto" } }),
      db.interaction.count({
        where: { type: "call", interactionDate: { gte: weekAgo } },
      }),
      db.syncLog.count({
        where: { source: "discord", createdAt: { gte: weekAgo } },
      }),
      db.githubEvent.count({
        where: { eventType: "push", eventAt: { gte: weekAgo } },
      }),
      db.githubEvent.count({
        where: {
          eventType: "pull_request",
          action: { in: ["opened", "open", "ready_for_review"] },
          eventAt: { gte: weekAgo },
        },
      }),
    ]);

  return {
    calls: { value: callsCount, label: "Calls", sub: "esta semana" },
    content: { value: contentCount, label: "Conteúdo", sub: "pronto p/ aprovar" },
    discord: { value: discordCount, label: "Discord", sub: "esta semana" },
    calendar: { value: callsCount, label: "Calendário", sub: "eventos esta semana" },
    github: {
      value: githubCommits > 0 ? `${githubCommits}c ${githubPrsOpen}pr` : "—",
      label: "GitHub",
      sub: githubCommits > 0 ? "esta semana" : "sem dados",
    },
  };
}

// ─── Validation / Trust ─────────────────────────────────────

export async function getValidationItems(): Promise<ValidationItem[]> {
  const db = await getTenantDb();
  const [tasks, feedbackItems] = await Promise.all([
    db.task.findMany({
      where: { validationStatus: "por_confirmar", archivedAt: null },
      include: {
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.feedbackItem.findMany({
      where: {
        ...NOT_ARCHIVED_FEEDBACK_ITEM,
        classification: { not: null },
        status: "pending",
        taskId: null,
      },
      include: {
        session: { include: { project: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const taskItems: ValidationItem[] = tasks.map((t) => ({
    id: t.id,
    kind: "task" as const,
    type: "tarefa" as const,
    title: t.title,
    project: t.project?.name ?? "—",
    confidence: Number(t.aiConfidence ?? 0),
    suggestedAssignee: t.assignee?.name,
    source: t.origin ?? "—",
    sourceDate: toDateStr(t.originDate),
  }));

  const feedbackValidation: ValidationItem[] = feedbackItems.map((fi) => ({
    id: fi.id,
    kind: "feedback" as const,
    type: "feedback_teste" as const,
    title: fi.aiSummary ?? fi.voiceTranscript?.slice(0, 80) ?? "Nota de voz",
    project: fi.session.project.name,
    confidence: 0.75,
    suggestedAssignee: undefined,
    source: `🎤 ${fi.session.testerName}`,
    sourceDate: toDateStr(fi.createdAt),
  }));

  return [...taskItems, ...feedbackValidation];
}

export async function getTrustScores(): Promise<TrustScoreData[]> {
  const db = await getTenantDb();
  const scores = await db.trustScore.findMany({
    where: { agentId: "maestro-internal" },
    orderBy: { extractionType: "asc" },
  });

  return scores.map((s) => ({
    type: s.extractionType as TrustScoreData["type"],
    score: s.score,
    confirmations: s.totalConfirmations,
    edits: s.totalEdits,
    rejections: s.totalRejections,
  }));
}

// ─── Maestro: trust scores + recent actions ─────────────────

export interface TrustScoreRow {
  id: string;
  agentId: string;
  extractionType: string;
  score: number;
  confirmations: number;
  edits: number;
  rejections: number;
  lastInteractionAt: Date | null;
}

export interface MaestroActionRow {
  id: string;
  agentId: string;
  extractionType: string;
  action: import("./maestro/trust-rules").ValidationAction;
  entityType: string;
  entityId: string;
  scoreDelta: number;
  scoreBefore: number;
  scoreAfter: number;
  performedByName: string | null;
  createdAt: Date;
}

export async function getTrustScoresByAgent(agentId: string): Promise<TrustScoreRow[]> {
  const db = await getTenantDb();
  const scores = await db.trustScore.findMany({
    where: { agentId },
    orderBy: { extractionType: "asc" },
  });
  return scores.map((s) => ({
    id: s.id,
    agentId: s.agentId,
    extractionType: s.extractionType,
    score: s.score,
    confirmations: s.totalConfirmations,
    edits: s.totalEdits,
    rejections: s.totalRejections,
    lastInteractionAt: s.lastInteractionAt,
  }));
}

export async function getAgentIds(): Promise<string[]> {
  const db = await getTenantDb();
  const rows = await db.trustScore.findMany({
    distinct: ["agentId"],
    select: { agentId: true },
    orderBy: { agentId: "asc" },
  });
  return rows.map((r) => r.agentId);
}

export async function getRecentMaestroActions(
  limit = 20,
  agentId?: string
): Promise<MaestroActionRow[]> {
  const db = await getTenantDb();
  const actions = await db.maestroAction.findMany({
    where: agentId ? { agentId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { performedBy: { select: { name: true } } },
  });

  return actions.map((a) => ({
    id: a.id,
    agentId: a.agentId,
    extractionType: a.extractionType,
    action: a.action as MaestroActionRow["action"],
    entityType: a.entityType,
    entityId: a.entityId,
    scoreDelta: a.scoreDelta,
    scoreBefore: a.scoreBefore,
    scoreAfter: a.scoreAfter,
    performedByName: a.performedBy?.name ?? null,
    createdAt: a.createdAt,
  }));
}

// ─── Content ────────────────────────────────────────────────

export async function getContentItems(): Promise<ContentItemData[]> {
  const db = await getTenantDb();
  const items = await db.contentItem.findMany({
    include: { approvedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return items.map((c) => ({
    id: c.id,
    title: c.title,
    format: c.format ?? "",
    status: c.status as ContentItemData["status"],
    sourceCallDate: toDateStr(c.sourceCallDate),
    platform: c.platform ?? undefined,
    approvedBy: c.approvedBy?.name,
    publishedAt: c.publishedAt ? c.publishedAt.toISOString() : undefined,
    projectId: c.projectId ?? undefined,
  }));
}

export async function getProjectsForContentSelect(): Promise<{ id: string; name: string }[]> {
  const db = await getTenantDb();
  return db.project.findMany({
    where: { archivedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ─── Workflows ──────────────────────────────────────────────

export async function getWorkflowTemplates(): Promise<WorkflowTemplateData[]> {
  const db = await getTenantDb();
  const templates = await db.workflowTemplate.findMany({
    include: {
      area: { select: { name: true, color: true, icon: true } },
      steps: { orderBy: { stepOrder: "asc" } },
      instances: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description ?? "",
    area: t.area?.name ?? "—",
    areaColor: t.area?.color ?? "#888",
    areaIcon: t.area?.icon ?? "folder",
    triggerType: t.triggerType as WorkflowTemplateData["triggerType"],
    estimatedDays: t.estimatedDurationDays ?? 0,
    stepsCount: t.steps.length,
    timesUsed: t.instances.length,
    steps: t.steps.map((s) => ({
      order: s.stepOrder,
      title: s.title,
      assigneeRole: s.defaultAssigneeRole ?? "—",
      deadlineDays: s.relativeDeadlineDays ?? 0,
      priority: s.priority as "alta" | "media" | "baixa" | "critica",
      dependsOn: s.dependsOn,
      isOptional: s.isOptional,
    })),
  }));
}

export async function getWorkflowInstances(): Promise<WorkflowInstanceData[]> {
  const db = await getTenantDb();
  const instances = await db.workflowInstance.findMany({
    where: { status: "em_curso" },
    include: {
      template: { select: { name: true } },
      area: { select: { name: true, color: true } },
      tasks: {
        include: {
          step: { select: { title: true } },
          task: { select: { assignee: { select: { name: true } } } },
        },
        orderBy: { stepOrder: "asc" },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  return instances.map((inst) => {
    const totalSteps = inst.tasks.length;
    const completedSteps = inst.tasks.filter((t) => t.status === "concluido").length;
    const nextTask = inst.tasks.find((t) => t.status === "em_curso" || t.status === "pendente");

    return {
      id: inst.id,
      templateName: inst.template.name,
      name: inst.name,
      area: inst.area?.name ?? "—",
      areaColor: inst.area?.color ?? "#888",
      status: inst.status as WorkflowInstanceData["status"],
      progress: inst.progress,
      totalSteps,
      completedSteps,
      nextStep: nextTask?.step?.title ?? "—",
      nextStepAssignee: nextTask?.task?.assignee?.name ?? "—",
      startedAt: inst.startedAt.toISOString(),
      steps: inst.tasks.map((t) => ({
        order: t.stepOrder,
        title: t.step?.title ?? "—",
        assignee: t.task?.assignee?.name ?? "—",
        deadlineDate: "",
        status: t.status as "pendente" | "em_curso" | "concluido" | "bloqueado" | "saltado",
      })),
    };
  });
}

// ─── OKR ───────────────────────────────────────────────────

export async function getOkrObjectives(user?: AuthUser | null): Promise<OkrObjectiveData[]> {
  const db = await getTenantDb();
  const pFilter = projectFilter(user);
  const hasFilter = Object.keys(pFilter).length > 0;

  const objectives = await db.objective.findMany({
    where: hasFilter ? { OR: [{ projectId: null }, { project: pFilter }] } : undefined,
    include: {
      project: { select: { name: true, slug: true, color: true } },
      keyResults: {
        where: { status: "ativo" },
        orderBy: { krOrder: "asc" },
        include: {
          tasks: {
            where: { archivedAt: null },
            select: {
              id: true,
              title: true,
              status: true,
              assignee: { select: { name: true } },
            },
            take: 10,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return objectives.map((o) => {
    const target = Number(o.targetValue ?? 0);
    const current = Number(o.currentValue);

    const keyResults: KeyResultData[] = o.keyResults.map((kr) => {
      const krTarget = Number(kr.targetValue ?? 0);
      const krCurrent = Number(kr.currentValue);
      return {
        id: kr.id,
        title: kr.title,
        targetValue: krTarget,
        currentValue: krCurrent,
        unit: kr.unit ?? "",
        weight: kr.weight,
        deadline: toDateStr(kr.deadline),
        status: kr.status,
        health: computeHealth(krTarget > 0 ? (krCurrent / krTarget) * 100 : 0, kr.deadline),
        linkedTasks: kr.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status as TaskData["status"],
          assignee: t.assignee?.name ?? "—",
        })),
      };
    });

    // Cascading progress: weighted average of KR progresses
    let computedProgress = 0;
    if (keyResults.length > 0) {
      let weightedSum = 0;
      let totalWeight = 0;
      for (const kr of keyResults) {
        const pct = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0;
        weightedSum += pct * kr.weight;
        totalWeight += kr.weight;
      }
      computedProgress = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    } else {
      computedProgress = target > 0 ? Math.round((current / target) * 100) : 0;
    }

    return {
      id: o.id,
      title: o.title,
      description: o.description ?? undefined,
      targetValue: target,
      currentValue: current,
      unit: o.unit ?? "",
      deadline: toDateStr(o.deadline),
      project: o.project?.name,
      projectSlug: o.project?.slug,
      projectColor: o.project?.color ?? undefined,
      health: computeHealth(computedProgress, o.deadline),
      keyResults,
      computedProgress,
    };
  });
}

export async function getRoadmapItems(user?: AuthUser | null): Promise<RoadmapItem[]> {
  const db = await getTenantDb();
  const pFilter = projectFilter(user);
  const hasFilter = Object.keys(pFilter).length > 0;

  const [phases, objectives] = await Promise.all([
    db.projectPhase.findMany({
      where: hasFilter ? { project: pFilter } : undefined,
      include: { project: { select: { name: true, color: true } } },
      orderBy: [{ project: { name: "asc" } }, { phaseOrder: "asc" }],
    }),
    db.objective.findMany({
      where: {
        deadline: { not: null },
        ...(hasFilter ? { OR: [{ projectId: null }, { project: pFilter }] } : {}),
      },
      include: {
        project: { select: { name: true, color: true } },
        keyResults: {
          where: { deadline: { not: null } },
          select: { id: true, title: true, deadline: true, currentValue: true, targetValue: true },
        },
      },
    }),
  ]);

  const items: RoadmapItem[] = [];

  // Project phases as bars
  for (const ph of phases) {
    if (!ph.startDate || !ph.endDate) continue;
    items.push({
      id: ph.id,
      type: "phase",
      title: ph.name,
      project: ph.project.name,
      projectColor: ph.project.color ?? "#888",
      startDate: toDateStr(ph.startDate),
      endDate: toDateStr(ph.endDate),
      progress: ph.progress,
      health: computeHealth(ph.progress, ph.endDate),
    });
  }

  // Objectives as milestones (use createdAt → deadline as range)
  for (const obj of objectives) {
    if (!obj.deadline) continue;
    items.push({
      id: obj.id,
      type: "objective",
      title: obj.title,
      project: obj.project?.name,
      projectColor: obj.project?.color ?? "#f97316",
      startDate: toDateStr(obj.createdAt),
      endDate: toDateStr(obj.deadline),
      progress: Number(obj.targetValue) > 0
        ? Math.round((Number(obj.currentValue) / Number(obj.targetValue)) * 100)
        : 0,
    });

    // Key Results as sub-milestones
    for (const kr of obj.keyResults) {
      if (!kr.deadline) continue;
      items.push({
        id: kr.id,
        type: "key_result",
        title: kr.title,
        project: obj.project?.name,
        projectColor: obj.project?.color ?? "#f97316",
        startDate: toDateStr(obj.createdAt),
        endDate: toDateStr(kr.deadline),
        progress: Number(kr.targetValue) > 0
          ? Math.round((Number(kr.currentValue) / Number(kr.targetValue)) * 100)
          : 0,
      });
    }
  }

  return items;
}

export async function getOkrSnapshots(
  entityType: string,
  entityId: string
): Promise<OkrSnapshotData[]> {
  const db = await getTenantDb();
  const snapshots = await db.okrSnapshot.findMany({
    where: { entityType, entityId },
    orderBy: { snapshotDate: "asc" },
  });
  return snapshots.map((s) => ({
    date: toDateStr(s.snapshotDate),
    value: Number(s.value),
  }));
}

// ─── GitHub Data ───────────────────────────────────────────

export async function getGithubData(repoId: string): Promise<{
  prs: GithubPR[];
  commits: GithubCommit[];
  deploys: GithubDeploy[];
  metrics: DevMetrics;
} | null> {
  const db = await getTenantDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [prEvents, commitEvents, deployEvents, dailyMetrics] =
    await Promise.all([
      db.githubEvent.findMany({
        where: { repoId, eventType: "pull_request" },
        orderBy: { eventAt: "desc" },
        take: 20,
      }),
      db.githubEvent.findMany({
        where: { repoId, eventType: "push", commitSha: { not: null } },
        orderBy: { eventAt: "desc" },
        take: 20,
      }),
      db.githubEvent.findMany({
        where: {
          repoId,
          eventType: { in: ["deploy", "workflow_run"] },
        },
        orderBy: { eventAt: "desc" },
        take: 10,
      }),
      db.devMetricsDaily.findMany({
        where: { repoId, date: { gte: thirtyDaysAgo } },
        orderBy: { date: "asc" },
      }),
    ]);

  // Deduplicate PRs by number (keep most recent event per PR)
  const prMap = new Map<number, (typeof prEvents)[0]>();
  for (const e of prEvents) {
    if (e.prNumber && !prMap.has(e.prNumber)) {
      prMap.set(e.prNumber, e);
    }
  }

  const prs: GithubPR[] = Array.from(prMap.values()).map((e) => ({
    number: e.prNumber!,
    title: e.title ?? "",
    author: e.author ?? "",
    status: (e.action === "closed"
      ? (e.rawPayload as Record<string, unknown>)?.merged
        ? "merged"
        : "closed"
      : (e.rawPayload as Record<string, unknown>)?.draft
        ? "draft"
        : "open") as GithubPR["status"],
    url: e.url ?? "",
    filesChanged: 0,
    openedAt: e.eventAt.toISOString(),
    linkedTask: e.taskId ?? undefined,
  }));

  const commits: GithubCommit[] = commitEvents.map((e) => ({
    sha: e.commitSha!,
    message: e.title ?? "",
    author: e.author ?? "",
    date: e.eventAt.toISOString(),
  }));

  const deploys: GithubDeploy[] = deployEvents.map((e) => ({
    id: e.id,
    status: (e.action === "success" ? "success" : "failure") as GithubDeploy["status"],
    branch: e.branch ?? "",
    author: e.author ?? "",
    date: e.eventAt.toISOString(),
  }));

  // Aggregate metrics
  const totals = dailyMetrics.reduce(
    (acc, d) => ({
      commits: acc.commits + d.commitsCount,
      prsOpen: acc.prsOpen + d.prsOpened,
      prsMerged: acc.prsMerged + d.prsMerged,
      deploysSuccess: acc.deploysSuccess + d.deploysSuccess,
      deploysFailed: acc.deploysFailed + d.deploysFailed,
    }),
    { commits: 0, prsOpen: 0, prsMerged: 0, deploysSuccess: 0, deploysFailed: 0 }
  );

  // Activity by week (last 4 weeks)
  const activityByWeek = [0, 0, 0, 0];
  for (const d of dailyMetrics) {
    const weeksAgo = Math.floor(
      (Date.now() - d.date.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    if (weeksAgo < 4) {
      activityByWeek[3 - weeksAgo] += d.commitsCount + d.prsMerged;
    }
  }

  const metrics: DevMetrics = {
    commitsThisMonth: totals.commits,
    prsOpen: totals.prsOpen,
    prsMerged: totals.prsMerged,
    deploysSuccess: totals.deploysSuccess,
    deploysFailed: totals.deploysFailed,
    velocity: activityByWeek[3],
    activityByWeek,
  };

  return { prs, commits, deploys, metrics };
}

// ─── Project Detail ─────────────────────────────────────────

export async function getProjectBySlug(slug: string): Promise<ProjectDetail | null> {
  const db = await getTenantDb();
  const p = await db.project.findFirst({
    where: { slug },
    include: {
      phases: { orderBy: { phaseOrder: "asc" } },
      tasks: {
        where: { archivedAt: null },
        include: { assignee: { select: { name: true, avatarColor: true } } },
        orderBy: [{ status: "asc" }, { kanbanOrder: "asc" }],
      },
      client: {
        include: {
          contacts: {
            include: { person: { select: { name: true, role: true, avatarColor: true } } },
          },
        },
      },
      interactions: {
        orderBy: { interactionDate: "desc" },
      },
      githubRepos: { take: 1 },
    },
  });

  if (!p) return null;

  const now = new Date();
  const activeTasks = p.tasks.filter((t) => t.status !== "feito").length;
  const overdueTasks = p.tasks.filter(
    (t) => t.deadline && t.deadline < now && t.status !== "feito"
  ).length;
  const activePhase = p.phases.find((ph) => ph.status === "em_curso");

  const tasks: TaskData[] = p.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? undefined,
    status: t.status as TaskData["status"],
    priority: t.priority as TaskData["priority"],
    assignee: t.assignee?.name ?? "—",
    assigneeId: t.assigneeId ?? undefined,
    assigneeColor: t.assignee?.avatarColor ?? "#888",
    phaseId: t.phaseId ?? undefined,
    areaId: t.areaId ?? undefined,
    origin: t.origin ?? undefined,
    deadline: t.deadline ? toDateStr(t.deadline) : undefined,
    daysStale: t.daysStale,
    aiExtracted: t.aiExtracted,
    aiConfidence: t.aiConfidence ? Number(t.aiConfidence) : undefined,
    validationStatus: t.validationStatus as TaskData["validationStatus"],
    devStatus: (t.devStatus as TaskData["devStatus"]) ?? undefined,
    githubBranch: t.githubBranch ?? undefined,
    githubPrNumber: t.githubPrNumber ?? undefined,
    githubPrUrl: t.githubPrUrl ?? undefined,
  }));

  const phases: PhaseData[] = p.phases.map((ph) => ({
    id: ph.id,
    name: ph.name,
    status: ph.status as PhaseData["status"],
    progress: ph.progress,
    startDate: toDateStr(ph.startDate),
    endDate: toDateStr(ph.endDate),
  }));

  let clientData: ClientData | undefined;
  if (p.client) {
    const primaryContact = p.client.contacts.find((c) => c.isPrimary);
    const nextStepTasks = p.tasks
      .filter((t) => t.status !== "feito")
      .slice(0, 5);

    // Resolve participant UUIDs to names
    const allParticipantIds = [...new Set(p.interactions.flatMap((i) => i.participants))];
    const participantPersons = allParticipantIds.length > 0
      ? await db.person.findMany({
          where: { id: { in: allParticipantIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameMap = new Map(participantPersons.map((p) => [p.id, p.name]));

    clientData = {
      id: p.client.id,
      companyName: p.client.companyName,
      primaryContact: primaryContact?.person.name ?? "—",
      status: p.client.status,
      daysSinceContact: p.client.daysSinceContact,
      contacts: p.client.contacts.map((c) => ({
        name: c.person.name,
        role: c.person.role ?? "",
        color: c.person.avatarColor ?? "#888",
      })),
      nextSteps: nextStepTasks.map((t) => ({
        title: t.title,
        assignee: t.assignee?.name ?? "—",
        priority: t.priority as TaskData["priority"],
        deadline: t.deadline ? toDateStr(t.deadline) : undefined,
      })),
      interactions: p.interactions.map((i) => ({
        id: i.id,
        type: i.type as ClientData["interactions"][0]["type"],
        title: i.title,
        body: i.body ?? undefined,
        date: i.interactionDate.toISOString(),
        participants: i.participants.map((pid) => nameMap.get(pid) ?? pid),
        participantIds: i.participants,
        source: i.source ?? undefined,
        sourceRef: i.sourceRef ?? undefined,
        clientId: i.clientId ?? "",
        projectId: i.projectId ?? undefined,
      })),
    };
  }

  // Fetch GitHub data if repo exists
  const githubRepo = p.githubRepos[0];
  const github = githubRepo ? await getGithubData(githubRepo.id) : undefined;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type as ProjectData["type"],
    status: p.status,
    health: p.health as Health,
    progress: p.progress,
    color: p.color ?? "#888",
    description: p.description ?? "",
    activeTasks,
    overdueTasks,
    activePhase: activePhase?.name,
    phases,
    tasks,
    client: clientData,
    repo: githubRepo?.repoFullName,
    github: github ?? undefined,
  };
}

// ─── Dashboard v1 · queries ──────────────────────────────────

import type {
  CrewRoleCardData,
  AutonomyData,
  ProjectAtRiskData,
  OpenDecisionData,
  ResolvedDecisionData,
  DecisionKind,
  AlertSeverity,
  PassiveAlertData,
  DevVelocityData,
  PipelineValueData,
  FeedEventData,
  CrewRoleSlug,
  CrewState,
  ExecutorKind,
} from "./types";
import {
  AUTONOMY_WINDOW_DAYS,
  FEED_DEFAULT_WINDOW_MINUTES,
  calcAutonomyPercent,
  classifyBudgetAlert,
  mapAlertSeverity,
  formatDeadline,
  DECISION_SEVERITY_RANK,
} from "./dashboard-helpers";

export async function getCrew(): Promise<CrewRoleCardData[]> {
  const db = await getTenantDb();
  const roles = await db.crewRole.findMany({
    orderBy: { order: "asc" },
    include: {
      executors: {
        where: { archivedAt: null },
        orderBy: { isPrimary: "desc" },
      },
    },
  });

  return roles.map((r) => {
    const primary = r.executors.find((e) => e.isPrimary) ?? r.executors[0];
    return {
      roleId: r.id,
      slug: r.slug as CrewRoleSlug,
      name: r.name,
      description: r.description ?? "",
      color: r.color,
      glyphKey: r.glyphKey,
      state: "idle" as CrewState, // real state logic lives in F2
      executor: {
        id: primary?.id ?? null,
        kind: (primary?.kind ?? "manual") as ExecutorKind,
        name: primary?.name ?? "—",
        note: primary?.note ?? null,
      },
      lastLine: null,
      load: 0,
    };
  });
}

/**
 * Autonomy % over the last 7 days.
 * Ratio of AI-proposed tasks that were accepted (`confirmed` or
 * `auto_confirmado`) vs. all tasks created in the window.
 */
export async function getAutonomy7d(): Promise<AutonomyData> {
  const db = await getTenantDb();
  const since = new Date(Date.now() - AUTONOMY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const where: Prisma.TaskWhereInput = { createdAt: { gte: since }, archivedAt: null };

  const [totalTasks, aiTasks] = await Promise.all([
    db.task.count({ where }),
    db.task.count({
      where: {
        ...where,
        aiExtracted: true,
        validationStatus: { in: ["confirmed", "auto_confirmado"] },
      },
    }),
  ]);

  return {
    percent: calcAutonomyPercent(aiTasks, totalTasks),
    aiTasks,
    totalTasks,
    windowDays: AUTONOMY_WINDOW_DAYS,
  };
}

/**
 * Projects currently in `warn` or `block` health, ordered by severity then
 * most recently updated.
 */
export async function getProjectsAtRisk(): Promise<ProjectAtRiskData[]> {
  const db = await getTenantDb();
  const projects = await db.project.findMany({
    where: {
      ...NOT_ARCHIVED,
      status: "ativo",
      health: { in: ["warn", "block"] },
    },
    select: { id: true, name: true, slug: true, health: true, description: true, updatedAt: true },
    orderBy: [{ health: "desc" }, { updatedAt: "desc" }],
    take: 10,
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    health: p.health as "warn" | "block",
    reason: p.description ?? "sem contexto",
  }));
}

/**
 * Open decisions for the right-hand column — only the ones currently
 * actionable (not resolved, not snoozed into the future).
 */
export async function getOpenDecisions(limit = 20): Promise<OpenDecisionData[]> {
  const db = await getTenantDb();
  const now = new Date();
  const rows = await db.decision.findMany({
    where: {
      resolvedAt: null,
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }],
    },
    select: {
      id: true,
      title: true,
      context: true,
      kind: true,
      severity: true,
      dueAt: true,
      snoozedUntil: true,
      crewRole: { select: { slug: true } },
    },
    take: limit,
  });

  return rows
    .map((r) => ({
      id: r.id,
      title: r.title,
      context: r.context ?? "",
      deadline: formatDeadline(r.dueAt),
      crewRoleSlug: (r.crewRole?.slug ?? null) as CrewRoleSlug | null,
      severity: r.severity as AlertSeverity,
      kind: r.kind as DecisionKind,
      snoozedUntil: r.snoozedUntil?.toISOString() ?? null,
    }))
    .sort((a, b) => {
      const sev = (DECISION_SEVERITY_RANK[b.severity] ?? 0) - (DECISION_SEVERITY_RANK[a.severity] ?? 0);
      if (sev !== 0) return sev;
      const aDue = a.deadline === null ? Infinity : 0;
      const bDue = b.deadline === null ? Infinity : 0;
      return aDue - bDue;
    });
}

/**
 * Decisions resolved in the last 24h — feeds the "Resolvidas · 24h"
 * toggle sub-view on the decisions column (Passo F).
 */
export async function getResolvedDecisions24h(): Promise<ResolvedDecisionData[]> {
  const db = await getTenantDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db.decision.findMany({
    where: { resolvedAt: { gte: since } },
    select: {
      id: true,
      title: true,
      context: true,
      kind: true,
      severity: true,
      dueAt: true,
      resolvedAt: true,
      resolutionNote: true,
      crewRole: { select: { slug: true } },
      resolvedBy: { select: { name: true } },
    },
    orderBy: { resolvedAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    context: r.context ?? "",
    deadline: formatDeadline(r.dueAt),
    crewRoleSlug: (r.crewRole?.slug ?? null) as CrewRoleSlug | null,
    severity: r.severity as AlertSeverity,
    kind: r.kind as DecisionKind,
    resolvedAt: r.resolvedAt!.toISOString(),
    resolvedByName: r.resolvedBy?.name ?? null,
    resolutionNote: r.resolutionNote,
  }));
}

/**
 * Count of feedback items awaiting triage (pending + not archived).
 */
export async function getPendingFeedback(): Promise<number> {
  const db = await getTenantDb();
  return db.feedbackItem.count({
    where: {
      ...NOT_ARCHIVED_FEEDBACK_ITEM,
      status: "pending",
    },
  });
}

/**
 * GitHub-based dev velocity for the Dashboard metrics strip.
 * Commits + PRs merged in the last 7d vs the previous 7d.
 */
export async function getDevVelocity(): Promise<DevVelocityData> {
  const db = await getTenantDb();
  const now = Date.now();
  const d7 = 7 * 24 * 60 * 60 * 1000;
  const since7 = new Date(now - d7);
  const since14 = new Date(now - 2 * d7);

  const [commits7d, commitsPrev7d, prsMerged7d, prsPrev7d] = await Promise.all([
    db.githubEvent.count({
      where: { eventType: "push", eventAt: { gte: since7 } },
    }),
    db.githubEvent.count({
      where: { eventType: "push", eventAt: { gte: since14, lt: since7 } },
    }),
    db.githubEvent.count({
      where: {
        eventType: "pull_request",
        action: "closed",
        eventAt: { gte: since7 },
      },
    }),
    db.githubEvent.count({
      where: {
        eventType: "pull_request",
        action: "closed",
        eventAt: { gte: since14, lt: since7 },
      },
    }),
  ]);

  return { commits7d, prsMerged7d, commitsPrev7d, prsPrev7d };
}

/**
 * Pipeline value: sum(value × probability) over open, non-archived opps.
 * Returned in cents so callers decide formatting.
 */
export async function getPipelineValue(): Promise<PipelineValueData> {
  const db = await getTenantDb();
  const opps = await db.opportunity.findMany({
    where: {
      archivedAt: null,
      closedAt: null,
      value: { not: null },
    },
    select: { value: true, probability: true, currency: true },
  });

  let totalCents = 0;
  let currency = "EUR";
  for (const o of opps) {
    const euros = Number(o.value);
    const prob = o.probability / 100;
    totalCents += Math.round(euros * 100 * prob);
    currency = o.currency ?? currency;
  }

  return {
    weightedValueCents: totalCents,
    openOpportunities: opps.length,
    currency,
  };
}

/**
 * Passive alerts for the right-hand column. Combines:
 *  - existing `Alert` rows (mapped to 3-level severity)
 *  - automatic budget alerts: projects whose InvestmentMap exceeds 90%
 *    (warn) / 100% (block) execution — replaces the removed
 *    `InvestmentSummaryCard` from the legacy dashboard.
 */
export async function getPassiveAlerts(): Promise<PassiveAlertData[]> {
  const db = await getTenantDb();

  // Existing alerts
  const alerts = await db.alert.findMany({
    where: { isDismissed: false },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      severity: true,
      title: true,
      description: true,
      project: { select: { slug: true } },
    },
  });

  const base: PassiveAlertData[] = alerts.map((a) => ({
    id: `alert:${a.id}`,
    severity: mapAlertSeverity(a.severity),
    text: a.description ? `${a.title} · ${a.description}` : a.title,
    crewRoleSlug: null,
    href: a.project?.slug ? `/project/${a.project.slug}` : null,
  }));

  // Budget alerts — aggregate rubric execution per project
  const maps = await db.investmentMap.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      projectId: true,
      project: { select: { name: true, slug: true } },
      rubrics: { select: { budgetAllocated: true, budgetExecuted: true } },
    },
  });

  for (const m of maps) {
    const { allocated, executed } = m.rubrics.reduce(
      (acc, r) => ({
        allocated: acc.allocated + Number(r.budgetAllocated ?? 0),
        executed: acc.executed + Number(r.budgetExecuted ?? 0),
      }),
      { allocated: 0, executed: 0 },
    );
    const severity = classifyBudgetAlert(executed, allocated);
    if (!severity) continue;

    const pct = Math.round((executed / allocated) * 100);
    base.push({
      id: `budget:${m.id}`,
      severity,
      text: `${m.project?.name ?? "Projecto"} · orçamento a ${pct}%`,
      crewRoleSlug: null,
      href: m.project?.slug ? `/project/${m.project.slug}` : null,
    });
  }

  return base;
}

/**
 * Feed events (last N minutes) for the central "Fluxo da manhã" stream.
 * Pulls from `MaestroAction` + `Alert` so the Dashboard shows real activity
 * today. Pills (`decide`/`revê`/`feito`) are always `null` on F1; F2 wires
 * them up once `getOpenDecisions` has real data.
 */
export async function getFeedEvents(
  windowMinutes: number = FEED_DEFAULT_WINDOW_MINUTES,
): Promise<FeedEventData[]> {
  const db = await getTenantDb();
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const [actions, alerts] = await Promise.all([
    db.maestroAction.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        createdAt: true,
        agentId: true,
        entityType: true,
        action: true,
      },
    }),
    db.alert.findMany({
      where: { createdAt: { gte: since }, isDismissed: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        title: true,
        type: true,
      },
    }),
  ]);

  const fromActions: FeedEventData[] = actions.map((a) => ({
    id: `action:${a.id}`,
    time: a.createdAt,
    crewRoleSlug: null, // filled in F2 once crewRoleId is populated
    executorKind: null,
    executorName: a.agentId,
    text: `${a.action} · ${a.entityType}`,
    pillKind: null,
    linkedDecisionId: null,
  }));

  const fromAlerts: FeedEventData[] = alerts.map((a) => ({
    id: `alert:${a.id}`,
    time: a.createdAt,
    crewRoleSlug: null,
    executorKind: null,
    executorName: null,
    text: a.title,
    pillKind: null,
    linkedDecisionId: null,
  }));

  return [...fromActions, ...fromAlerts].sort((a, b) => b.time.getTime() - a.time.getTime());
}
