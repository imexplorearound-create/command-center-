import { prisma } from "./db";
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
} from "./types";

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
  const projects = await prisma.project.findMany({
    where: projectFilter(user),
    include: {
      phases: { where: { status: "em_curso" }, take: 1 },
      tasks: { select: { status: true, deadline: true } },
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
  const pFilter = projectFilter(user);
  const hasFilter = Object.keys(pFilter).length > 0;
  const objectives = await prisma.objective.findMany({
    where: hasFilter ? { OR: [{ projectId: null }, { project: pFilter }] } : undefined,
    include: {
      project: { select: { name: true, color: true, tasks: { select: { id: true, title: true, status: true, assignee: { select: { name: true } } }, take: 5 } } },
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
  const pFilter = projectFilter(user);
  const hasFilter = Object.keys(pFilter).length > 0;
  const alerts = await prisma.alert.findMany({
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
  const pFilter = projectFilter(user);
  const hasFilter = Object.keys(pFilter).length > 0;
  const taskWhere: Prisma.TaskWhereInput = hasFilter ? { project: pFilter } : {};

  const [totalTasks, overdueTasks, completedTasks, activeProjects] =
    await Promise.all([
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({
        where: {
          ...taskWhere,
          deadline: { lt: new Date() },
          status: { not: "feito" },
        },
      }),
      prisma.task.count({ where: { ...taskWhere, status: "feito" } }),
      prisma.project.count({ where: { status: "ativo", ...pFilter } }),
    ]);

  return { totalTasks, overdueTasks, completedTasks, activeProjects };
}

export async function getSatellites(): Promise<Record<string, SatelliteData>> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [contentCount, callsCount, discordCount, githubCommits, githubPrsOpen] =
    await Promise.all([
      prisma.contentItem.count({ where: { status: "pronto" } }),
      prisma.interaction.count({
        where: { type: "call", interactionDate: { gte: weekAgo } },
      }),
      prisma.syncLog.count({
        where: { source: "discord", createdAt: { gte: weekAgo } },
      }),
      prisma.githubEvent.count({
        where: { eventType: "push", eventAt: { gte: weekAgo } },
      }),
      prisma.githubEvent.count({
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
  const items = await prisma.task.findMany({
    where: { validationStatus: "por_confirmar" },
    include: {
      project: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return items.map((t) => ({
    id: t.id,
    type: "tarefa" as const,
    title: t.title,
    project: t.project?.name ?? "—",
    confidence: Number(t.aiConfidence ?? 0),
    suggestedAssignee: t.assignee?.name,
    source: t.origin ?? "—",
    sourceDate: toDateStr(t.originDate),
  }));
}

export async function getTrustScores(): Promise<TrustScoreData[]> {
  const scores = await prisma.trustScore.findMany({
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

// ─── Content ────────────────────────────────────────────────

export async function getContentItems(): Promise<ContentItemData[]> {
  const items = await prisma.contentItem.findMany({
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
  }));
}

// ─── Workflows ──────────────────────────────────────────────

export async function getWorkflowTemplates(): Promise<WorkflowTemplateData[]> {
  const templates = await prisma.workflowTemplate.findMany({
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
  const instances = await prisma.workflowInstance.findMany({
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

// ─── GitHub Data ───────────────────────────────────────────

export async function getGithubData(repoId: string): Promise<{
  prs: GithubPR[];
  commits: GithubCommit[];
  deploys: GithubDeploy[];
  metrics: DevMetrics;
} | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [prEvents, commitEvents, deployEvents, dailyMetrics] =
    await Promise.all([
      prisma.githubEvent.findMany({
        where: { repoId, eventType: "pull_request" },
        orderBy: { eventAt: "desc" },
        take: 20,
      }),
      prisma.githubEvent.findMany({
        where: { repoId, eventType: "push", commitSha: { not: null } },
        orderBy: { eventAt: "desc" },
        take: 20,
      }),
      prisma.githubEvent.findMany({
        where: {
          repoId,
          eventType: { in: ["deploy", "workflow_run"] },
        },
        orderBy: { eventAt: "desc" },
        take: 10,
      }),
      prisma.devMetricsDaily.findMany({
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
  const p = await prisma.project.findUnique({
    where: { slug },
    include: {
      phases: { orderBy: { phaseOrder: "asc" } },
      tasks: {
        include: { assignee: { select: { name: true, avatarColor: true } } },
        orderBy: { createdAt: "asc" },
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
    status: t.status as TaskData["status"],
    priority: t.priority as TaskData["priority"],
    assignee: t.assignee?.name ?? "—",
    assigneeColor: t.assignee?.avatarColor ?? "#888",
    origin: t.origin ?? undefined,
    deadline: t.deadline ? toDateStr(t.deadline) : undefined,
    daysStale: t.daysStale,
    aiExtracted: t.aiExtracted,
    aiConfidence: t.aiConfidence ? Number(t.aiConfidence) : undefined,
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

    clientData = {
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
        participants: i.participants,
        source: i.source ?? undefined,
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
