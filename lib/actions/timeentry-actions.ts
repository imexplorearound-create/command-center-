"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireWriter, requireManager } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { timeEntryCreateSchema, timeEntryUpdateSchema } from "@/lib/validation/timeentry-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import type { ActionResult } from "./types";

// ─── Create ─────────────────────────────────────────────────

export async function createTimeEntry(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    taskId: formData.get("taskId") as string || undefined,
    projectId: formData.get("projectId") as string || undefined,
    areaId: formData.get("areaId") as string || undefined,
    date: formData.get("date") as string,
    duration: formData.get("duration") as string,
    description: formData.get("description") as string || undefined,
    isBillable: formData.get("isBillable") as string || "true",
  };

  const parsed = timeEntryCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();

  // If taskId provided but no projectId, derive from task
  let projectId = parsed.data.projectId;
  if (parsed.data.taskId && !projectId) {
    const task = await db.task.findFirst({
      where: { id: parsed.data.taskId },
      select: { projectId: true },
    });
    if (task?.projectId) projectId = task.projectId;
  }

  const entry = await db.timeEntry.create({
    data: {
      tenantId: "",
      personId: auth.user.personId,
      taskId: parsed.data.taskId,
      projectId,
      areaId: parsed.data.areaId,
      date: parsed.data.date,
      duration: parsed.data.duration,
      description: parsed.data.description,
      isBillable: parsed.data.isBillable,
    },
  });

  revalidatePath("/timetracking");
  return { success: true, data: { id: entry.id } };
}

// ─── Update ─────────────────────────────────────────────────

export async function updateTimeEntry(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const id = formData.get("id") as string;
  if (!id) return { error: "ID obrigatório" };

  const db = await getTenantDb();
  const existing = await db.timeEntry.findFirst({ where: { id } });
  if (!existing) return { error: "Registo não encontrado" };
  if (existing.status !== "draft") return { error: "Só rascunhos podem ser editados" };

  const raw: Record<string, unknown> = {};
  for (const key of ["taskId", "projectId", "areaId", "date", "duration", "description", "isBillable"]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const parsed = timeEntryUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await db.timeEntry.update({ where: { id }, data: parsed.data });

  revalidatePath("/timetracking");
  return { success: true };
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteTimeEntry(id: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const existing = await db.timeEntry.findFirst({ where: { id } });
  if (!existing) return { error: "Registo não encontrado" };
  if (existing.status !== "draft") return { error: "Só rascunhos podem ser eliminados" };

  await db.timeEntry.delete({ where: { id } });

  revalidatePath("/timetracking");
  return { success: true };
}

// ─── Submit / Approve / Reject ──────────────────────────────

export async function submitTimeEntries(ids: string[]): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  await db.timeEntry.updateMany({
    where: { id: { in: ids }, status: "draft", personId: auth.user.personId },
    data: { status: "submitted" },
  });

  revalidatePath("/timetracking");
  return { success: true };
}

export async function approveTimeEntries(ids: string[]): Promise<ActionResult> {
  const auth = await requireManager();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  await db.timeEntry.updateMany({
    where: { id: { in: ids }, status: "submitted" },
    data: { status: "approved", approvedById: auth.user.personId },
  });

  revalidatePath("/timetracking");
  return { success: true };
}

export async function rejectTimeEntries(ids: string[]): Promise<ActionResult> {
  const auth = await requireManager();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  await db.timeEntry.updateMany({
    where: { id: { in: ids }, status: "submitted" },
    data: { status: "rejected" },
  });

  revalidatePath("/timetracking");
  return { success: true };
}

// ─── Timer ──────────────────────────────────────────────────

export async function startTimer(taskId: string): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  // Derive projectId from task
  let projectId: string | null = null;
  const task = await db.task.findFirst({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (task?.projectId) projectId = task.projectId;

  const now = new Date();
  const entry = await db.timeEntry.create({
    data: {
      tenantId: "",
      personId: auth.user.personId,
      taskId,
      projectId,
      date: now,
      duration: 0,
      startTime: now,
      origin: "timer",
    },
  });

  revalidatePath("/timetracking");
  return { success: true, data: { id: entry.id } };
}

export async function stopTimer(entryId: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const entry = await db.timeEntry.findFirst({ where: { id: entryId } });
  if (!entry) return { error: "Registo não encontrado" };
  if (!entry.startTime) return { error: "Sem timer activo" };

  const now = new Date();
  const durationMs = now.getTime() - entry.startTime.getTime();
  const duration = Math.max(1, Math.round(durationMs / 60000));

  await db.timeEntry.update({
    where: { id: entryId },
    data: { endTime: now, duration },
  });

  revalidatePath("/timetracking");
  return { success: true };
}
