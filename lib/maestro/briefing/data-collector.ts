import "server-only";
import type { TenantPrisma } from "@/lib/db";

export interface BriefingUser {
  id: string;
  role: string;
  name: string;
  personId: string;
}

export interface BriefingTenant {
  id: string;
  name: string;
  locale: string;
  timezone: string;
}

export interface OverdueTaskRow {
  id: string;
  title: string;
  projectSlug: string | null;
  projectName: string | null;
  deadline: string;
  daysLate: number;
  priority: string;
}

export interface DueSoonTaskRow {
  id: string;
  title: string;
  projectSlug: string | null;
  projectName: string | null;
  deadline: string;
  daysUntil: number;
  priority: string;
}

export interface PendingValidationRow {
  id: string;
  kind: "task" | "interaction" | "decision" | "feedback";
  title: string;
  createdAt: string;
}

export interface TrustDelta {
  extractionType: string;
  delta: number;
}

export interface BriefingData {
  user: BriefingUser;
  tenant: BriefingTenant;
  overdueTasks: OverdueTaskRow[];
  dueSoonTasks: DueSoonTaskRow[];
  pendingValidations: PendingValidationRow[];
  recentChanges: {
    tasksCreated: number;
    tasksCompleted: number;
    feedbackItemsNew: number;
    decisionsResolved: number;
  };
  trustDeltas: TrustDelta[];
}

const DUE_SOON_DAYS = 3;
const PENDING_CAP = 5;
const MS_PER_DAY = 86_400_000;

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

export interface CollectorContext {
  tenant: BriefingTenant;
  user: BriefingUser;
  now: Date;
}

export async function collectBriefingData(
  db: TenantPrisma,
  ctx: CollectorContext,
): Promise<BriefingData> {
  const { user, tenant, now } = ctx;
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const dueSoonCutoff = new Date(today.getTime() + DUE_SOON_DAYS * MS_PER_DAY);
  const since24h = new Date(now.getTime() - MS_PER_DAY);

  const allowedProjectIds = await resolveAllowedProjectIds(db, user);

  const taskBaseWhere: Record<string, unknown> = {
    archivedAt: null,
    assigneeId: user.personId,
  };
  if (allowedProjectIds !== null) {
    taskBaseWhere.OR = [
      { projectId: { in: allowedProjectIds } },
      { projectId: null },
    ];
  }

  const overdueRaw = await db.task.findMany({
    where: {
      ...taskBaseWhere,
      deadline: { lt: today },
      status: { notIn: ["concluida", "cancelada"] },
    },
    select: {
      id: true,
      title: true,
      deadline: true,
      priority: true,
      project: { select: { slug: true, name: true } },
    },
    orderBy: { deadline: "asc" },
    take: 20,
  });

  const dueSoonRaw = await db.task.findMany({
    where: {
      ...taskBaseWhere,
      deadline: { gte: today, lte: dueSoonCutoff },
      status: { notIn: ["concluida", "cancelada"] },
    },
    select: {
      id: true,
      title: true,
      deadline: true,
      priority: true,
      project: { select: { slug: true, name: true } },
    },
    orderBy: { deadline: "asc" },
    take: 20,
  });

  const overdueTasks: OverdueTaskRow[] = overdueRaw.map((t) => ({
    id: t.id,
    title: t.title,
    projectSlug: t.project?.slug ?? null,
    projectName: t.project?.name ?? null,
    deadline: (t.deadline as Date).toISOString().slice(0, 10),
    daysLate: diffDays(today, t.deadline as Date),
    priority: t.priority,
  }));

  const dueSoonTasks: DueSoonTaskRow[] = dueSoonRaw.map((t) => ({
    id: t.id,
    title: t.title,
    projectSlug: t.project?.slug ?? null,
    projectName: t.project?.name ?? null,
    deadline: (t.deadline as Date).toISOString().slice(0, 10),
    daysUntil: diffDays(t.deadline as Date, today),
    priority: t.priority,
  }));

  const pendingValidations = await collectPendingValidations(db, user, allowedProjectIds);

  const [tasksCreated, tasksCompleted, feedbackItemsNew, decisionsResolved] =
    await Promise.all([
      countRecentTasksCreated(db, user, allowedProjectIds, since24h),
      countRecentTasksCompleted(db, user, allowedProjectIds, since24h),
      user.role === "admin" || user.role === "manager"
        ? db.feedbackItem.count({ where: { createdAt: { gte: since24h } } })
        : Promise.resolve(0),
      user.role === "admin" || user.role === "manager"
        ? db.decision.count({ where: { resolvedAt: { gte: since24h } } })
        : Promise.resolve(0),
    ]);

  const trustDeltas =
    user.role === "admin" ? await collectTrustDeltas(db, since24h) : [];

  return {
    user,
    tenant,
    overdueTasks,
    dueSoonTasks,
    pendingValidations,
    recentChanges: {
      tasksCreated,
      tasksCompleted,
      feedbackItemsNew,
      decisionsResolved,
    },
    trustDeltas,
  };
}

export function isBriefingDataEmpty(data: BriefingData): boolean {
  const { recentChanges, trustDeltas, overdueTasks, dueSoonTasks, pendingValidations } = data;
  return (
    overdueTasks.length === 0 &&
    dueSoonTasks.length === 0 &&
    pendingValidations.length === 0 &&
    trustDeltas.length === 0 &&
    recentChanges.tasksCreated === 0 &&
    recentChanges.tasksCompleted === 0 &&
    recentChanges.feedbackItemsNew === 0 &&
    recentChanges.decisionsResolved === 0
  );
}

async function resolveAllowedProjectIds(
  db: TenantPrisma,
  user: BriefingUser,
): Promise<string[] | null> {
  if (user.role === "admin" || user.role === "manager") return null;
  const access = await db.userProjectAccess.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  return access.map((a) => a.projectId);
}

async function collectPendingValidations(
  db: TenantPrisma,
  user: BriefingUser,
  allowedProjectIds: string[] | null,
): Promise<PendingValidationRow[]> {
  const projectFilter =
    allowedProjectIds === null
      ? {}
      : { OR: [{ projectId: { in: allowedProjectIds } }, { projectId: null }] };

  const taskFilter: Record<string, unknown> = {
    archivedAt: null,
    validationStatus: "por_confirmar",
    ...projectFilter,
  };
  if (user.role === "membro") taskFilter.assigneeId = user.personId;

  const tasks = await db.task.findMany({
    where: taskFilter,
    select: { id: true, title: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: PENDING_CAP,
  });

  return tasks.map((t) => ({
    id: t.id,
    kind: "task" as const,
    title: t.title,
    createdAt: t.createdAt.toISOString(),
  }));
}

async function countRecentTasksCreated(
  db: TenantPrisma,
  user: BriefingUser,
  allowedProjectIds: string[] | null,
  since: Date,
): Promise<number> {
  const where: Record<string, unknown> = {
    createdAt: { gte: since },
    archivedAt: null,
  };
  if (allowedProjectIds !== null) {
    where.OR = [{ projectId: { in: allowedProjectIds } }, { projectId: null }];
  }
  return db.task.count({ where });
}

async function countRecentTasksCompleted(
  db: TenantPrisma,
  user: BriefingUser,
  allowedProjectIds: string[] | null,
  since: Date,
): Promise<number> {
  const where: Record<string, unknown> = {
    completedAt: { gte: since },
    assigneeId: user.personId,
  };
  if (allowedProjectIds !== null) {
    where.OR = [{ projectId: { in: allowedProjectIds } }, { projectId: null }];
  }
  return db.task.count({ where });
}

async function collectTrustDeltas(
  db: TenantPrisma,
  since: Date,
): Promise<TrustDelta[]> {
  const actions = await db.maestroAction.findMany({
    where: { createdAt: { gte: since } },
    select: { extractionType: true, scoreDelta: true },
  });
  const map = new Map<string, number>();
  for (const a of actions) {
    map.set(a.extractionType, (map.get(a.extractionType) ?? 0) + a.scoreDelta);
  }
  return [...map.entries()]
    .filter(([, delta]) => delta !== 0)
    .map(([extractionType, delta]) => ({ extractionType, delta }));
}
