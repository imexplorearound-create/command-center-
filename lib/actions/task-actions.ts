"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireWriter, requireAdmin } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  taskCreateSchema,
  taskUpdateSchema,
  taskMoveSchema,
  emptyToNull,
} from "@/lib/validation/task-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import type { TaskStatus } from "@/lib/types";
import type { ActionResult } from "./types";
import { createTaskCore } from "./task-create-core";
import { hookAutoTrainingFromTask } from "@/lib/maestro/auto-training";

// ─── Helpers ────────────────────────────────────────────────

function field(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
}

async function projectSlug(projectId: string | null | undefined): Promise<string | null> {
  if (!projectId) return null;
  const db = await getTenantDb();
  const p = await db.project.findUnique({
    where: { id: projectId },
    select: { slug: true },
  });
  return p?.slug ?? null;
}

function revalidateTaskPaths(slug: string | null) {
  revalidatePath("/");
  if (slug) revalidatePath(`/project/${slug}`);
}

/** Spec: nunca mover para 'feito' sem ter validado primeiro. */
function blockMoveToFeito(
  current: { status: string; validationStatus: string },
  nextStatus: string
): string | null {
  if (
    nextStatus === "feito" &&
    current.status !== "feito" &&
    current.validationStatus === "por_confirmar"
  ) {
    return "Confirma a tarefa antes de a marcar como feita";
  }
  return null;
}

// ─── Create ─────────────────────────────────────────────────

export async function createTask(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    title: field(formData, "title") ?? "",
    description: field(formData, "description") ?? "",
    projectId: field(formData, "projectId") ?? "",
    phaseId: field(formData, "phaseId") ?? "",
    areaId: field(formData, "areaId") ?? "",
    assigneeId: field(formData, "assigneeId") ?? "",
    status: field(formData, "status") ?? "backlog",
    priority: field(formData, "priority") ?? "media",
    deadline: field(formData, "deadline") ?? "",
    origin: field(formData, "origin") ?? "",
  };

  const parsed = taskCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const result = await createTaskCore({
    title: data.title,
    description: emptyToNull(data.description),
    projectId: emptyToNull(data.projectId),
    phaseId: emptyToNull(data.phaseId),
    areaId: emptyToNull(data.areaId),
    assigneeId: emptyToNull(data.assigneeId),
    status: data.status,
    priority: data.priority,
    deadline: data.deadline ? new Date(data.deadline) : null,
    origin: emptyToNull(data.origin),
  });

  if (!result.ok) return { error: result.error };
  return { success: true, data: { id: result.id } };
}

// ─── Update ─────────────────────────────────────────────────

export async function updateTask(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const id = field(formData, "id");
  if (!id) return { error: "ID da tarefa obrigatório" };

  const raw: Record<string, unknown> = {};
  for (const key of [
    "title",
    "description",
    "phaseId",
    "areaId",
    "assigneeId",
    "status",
    "priority",
    "deadline",
  ] as const) {
    const v = field(formData, key);
    if (v !== undefined) raw[key] = v;
  }

  const parsed = taskUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const db = await getTenantDb();

  const existing = await db.task.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      status: true,
      archivedAt: true,
      validationStatus: true,
      aiExtracted: true,
    },
  });
  if (!existing) return { error: "Tarefa não encontrada" };
  if (existing.archivedAt) return { error: "Tarefa arquivada não pode ser editada" };

  if (data.status !== undefined) {
    const blocked = blockMoveToFeito(existing, data.status);
    if (blocked) return { error: blocked };
  }

  const updateData: Prisma.TaskUpdateInput = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = emptyToNull(data.description);
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.deadline !== undefined)
    updateData.deadline = data.deadline ? new Date(data.deadline) : null;
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === "feito" && existing.status !== "feito") {
      updateData.completedAt = new Date();
    } else if (data.status !== "feito" && existing.status === "feito") {
      updateData.completedAt = null;
    }
  }
  if (data.phaseId !== undefined) {
    const v = emptyToNull(data.phaseId);
    updateData.phase = v ? { connect: { id: v } } : { disconnect: true };
  }
  if (data.areaId !== undefined) {
    const v = emptyToNull(data.areaId);
    updateData.area = v ? { connect: { id: v } } : { disconnect: true };
  }
  if (data.assigneeId !== undefined) {
    const v = emptyToNull(data.assigneeId);
    updateData.assignee = v ? { connect: { id: v } } : { disconnect: true };
  }

  try {
    await db.task.update({ where: { id }, data: updateData });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return { error: `Erro ao actualizar tarefa (${e.code})` };
    }
    throw e;
  }

  if (data.status !== undefined) {
    hookAutoTrainingFromTask(existing, data.status, auth.user.personId);
  }

  const slug = await projectSlug(existing.projectId);
  revalidateTaskPaths(slug);
  return { success: true, data: { id } };
}

// ─── Archive (soft delete) ──────────────────────────────────

export async function archiveTask(id: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const task = await db.task.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      archivedAt: true,
      workflowInstanceTasks: {
        where: { instance: { status: "em_curso" } },
        take: 1,
        select: { id: true },
      },
    },
  });
  if (!task) return { error: "Tarefa não encontrada" };
  if (task.archivedAt) return { error: "Tarefa já está arquivada" };
  if (task.workflowInstanceTasks.length > 0) {
    return {
      error:
        "Não é possível arquivar: tarefa pertence a um workflow activo. Cancela o workflow primeiro.",
    };
  }

  await db.task.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  const slug = await projectSlug(task.projectId);
  revalidateTaskPaths(slug);
  return { success: true };
}

// ─── Restore ────────────────────────────────────────────────

export async function restoreTask(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const task = await db.task.findUnique({
    where: { id },
    select: { id: true, projectId: true, archivedAt: true },
  });
  if (!task) return { error: "Tarefa não encontrada" };
  if (!task.archivedAt) return { error: "Tarefa não está arquivada" };

  await db.task.update({
    where: { id },
    data: { archivedAt: null },
  });

  const slug = await projectSlug(task.projectId);
  revalidateTaskPaths(slug);
  return { success: true };
}

// ─── Move (drag & drop) ─────────────────────────────────────

export async function moveTask(
  id: string,
  input: { toStatus: TaskStatus; toIndex: number }
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const parsed = taskMoveSchema.safeParse(input);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const { toStatus, toIndex } = parsed.data;

  const db = await getTenantDb();

  const task = await db.task.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      status: true,
      kanbanOrder: true,
      archivedAt: true,
      validationStatus: true,
      aiExtracted: true,
    },
  });
  if (!task) return { error: "Tarefa não encontrada" };
  if (task.archivedAt) return { error: "Tarefa arquivada não pode ser movida" };

  const blocked = blockMoveToFeito(task, toStatus);
  if (blocked) return { error: blocked };

  await db.$transaction(async (tx) => {
    const sameColumn = task.status === toStatus;

    // Lê fonte e destino em paralelo
    const [sourceItems, destItems] = await Promise.all([
      sameColumn
        ? Promise.resolve([])
        : tx.task.findMany({
            where: {
              projectId: task.projectId,
              status: task.status,
              archivedAt: null,
              id: { not: id },
            },
            orderBy: { kanbanOrder: "asc" },
            select: { id: true },
          }),
      tx.task.findMany({
        where: {
          projectId: task.projectId,
          status: toStatus,
          archivedAt: null,
          ...(sameColumn ? { id: { not: id } } : {}),
        },
        orderBy: { kanbanOrder: "asc" },
        select: { id: true },
      }),
    ]);

    const destIds = destItems.map((i) => i.id);
    const safeIndex = Math.min(Math.max(toIndex, 0), destIds.length);
    destIds.splice(safeIndex, 0, id);

    // Updates em paralelo dentro da transaction (Prisma pipelines)
    const updates: Promise<unknown>[] = [];

    for (let i = 0; i < sourceItems.length; i++) {
      updates.push(
        tx.task.update({ where: { id: sourceItems[i].id }, data: { kanbanOrder: i } })
      );
    }

    for (let i = 0; i < destIds.length; i++) {
      const updateData: Prisma.TaskUpdateInput = { kanbanOrder: i };
      if (destIds[i] === id && !sameColumn) {
        updateData.status = toStatus;
        if (toStatus === "feito") {
          updateData.completedAt = new Date();
        } else if (task.status === "feito") {
          updateData.completedAt = null;
        }
      }
      updates.push(tx.task.update({ where: { id: destIds[i] }, data: updateData }));
    }

    await Promise.all(updates);
  });

  hookAutoTrainingFromTask(task, toStatus, auth.user.personId);

  const slug = await projectSlug(task.projectId);
  revalidateTaskPaths(slug);
  return { success: true };
}

