import "server-only";
import { getTenantDb } from "@/lib/tenant";
import type { TimeEntryData, WeekSummary } from "@/lib/types";

function formatEntry(e: any): TimeEntryData {
  return {
    id: e.id,
    personId: e.personId,
    personName: e.person?.name ?? "",
    taskId: e.taskId,
    taskTitle: e.task?.title ?? null,
    projectId: e.projectId,
    projectName: e.project?.name ?? null,
    areaId: e.areaId,
    date: e.date.toISOString().slice(0, 10),
    duration: e.duration,
    startTime: e.startTime?.toISOString() ?? null,
    endTime: e.endTime?.toISOString() ?? null,
    description: e.description,
    isBillable: e.isBillable,
    status: e.status as TimeEntryData["status"],
    origin: e.origin,
  };
}

const ENTRY_INCLUDES = {
  person: { select: { name: true } },
  task: { select: { title: true } },
  project: { select: { name: true } },
} as const;

export async function getTimeEntries(
  personId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<TimeEntryData[]> {
  const db = await getTenantDb();
  const entries = await db.timeEntry.findMany({
    where: {
      personId,
      date: { gte: weekStart, lte: weekEnd },
      archivedAt: null,
    },
    include: ENTRY_INCLUDES,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  return entries.map(formatEntry);
}

export async function getWeekSummary(
  personId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<WeekSummary> {
  const db = await getTenantDb();
  const [entries, person] = await Promise.all([
    db.timeEntry.findMany({
      where: { personId, date: { gte: weekStart, lte: weekEnd }, archivedAt: null },
      include: ENTRY_INCLUDES,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    db.person.findFirst({
      where: { id: personId },
      select: { weeklyHours: true },
    }),
  ]);

  const formatted = entries.map(formatEntry);
  const dayMap = new Map<string, TimeEntryData[]>();

  // Initialize 7 days
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    dayMap.set(d.toISOString().slice(0, 10), []);
  }

  let weekTotal = 0;
  let billableMinutes = 0;

  for (const entry of formatted) {
    const dayKey = entry.date;
    const arr = dayMap.get(dayKey) ?? [];
    arr.push(entry);
    dayMap.set(dayKey, arr);
    weekTotal += entry.duration;
    if (entry.isBillable) billableMinutes += entry.duration;
  }

  const days = Array.from(dayMap.entries()).map(([date, dayEntries]) => ({
    date,
    totalMinutes: dayEntries.reduce((sum, e) => sum + e.duration, 0),
    entries: dayEntries,
  }));

  return {
    days,
    weekTotal,
    contractedHours: person?.weeklyHours ?? 40,
    billableMinutes,
  };
}

export async function getTeamTimeEntries(
  weekStart: Date,
  weekEnd: Date,
  status?: string
): Promise<TimeEntryData[]> {
  const db = await getTenantDb();
  const where: Record<string, unknown> = {
    date: { gte: weekStart, lte: weekEnd },
    archivedAt: null,
  };
  if (status) where.status = status;

  const entries = await db.timeEntry.findMany({
    where,
    include: ENTRY_INCLUDES,
    orderBy: [{ person: { name: "asc" } }, { date: "asc" }],
  });
  return entries.map(formatEntry);
}

export async function getTimetrackingOptions() {
  const db = await getTenantDb();
  const [projects, tasks] = await Promise.all([
    db.project.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.task.findMany({
      where: { archivedAt: null, status: { not: "feito" } },
      select: { id: true, title: true, projectId: true },
      orderBy: { title: "asc" },
      take: 200,
    }),
  ]);
  return { projects, tasks };
}
