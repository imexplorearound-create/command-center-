"use server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";

// ─── Progress Recalculation ────────────────────────────────

async function recalculateObjectiveProgress(objectiveId: string) {
  const objective = await prisma.objective.findUnique({
    where: { id: objectiveId },
    include: { keyResults: { where: { status: "ativo" } } },
  });
  if (!objective) return;

  const krs = objective.keyResults;
  if (krs.length === 0) return;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const kr of krs) {
    const target = Number(kr.targetValue ?? 0);
    const pct = target > 0 ? (Number(kr.currentValue) / target) * 100 : 0;
    weightedSum += pct * kr.weight;
    totalWeight += kr.weight;
  }

  const pct = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const target = Number(objective.targetValue ?? 0);
  const newCurrent = target > 0 ? (pct / 100) * target : 0;

  await prisma.objective.update({
    where: { id: objectiveId },
    data: { currentValue: Math.round(newCurrent * 100) / 100 },
  });
}

async function recordSnapshot(entityType: string, entityId: string, value: number) {
  const today = new Date(new Date().toISOString().split("T")[0]);
  await prisma.okrSnapshot.upsert({
    where: { entityType_entityId_snapshotDate: { entityType, entityId, snapshotDate: today } },
    create: { entityType, entityId, value, snapshotDate: today },
    update: { value },
  });
}

// ─── Objectives CRUD ───────────────────────────────────────

export async function createObjective(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return { error: "Sem permissão" };

  const title = formData.get("title") as string;
  if (!title) return { error: "Título obrigatório" };

  const targetValue = parseFloat(formData.get("targetValue") as string) || 0;
  const unit = formData.get("unit") as string;
  const deadline = formData.get("deadline") as string;
  const projectId = formData.get("projectId") as string;
  const description = formData.get("description") as string;

  await prisma.objective.create({
    data: {
      title,
      description: description || null,
      targetValue: targetValue || null,
      unit: unit || null,
      deadline: deadline ? new Date(deadline) : null,
      projectId: projectId || null,
    },
  });

  revalidatePath("/objectives");
  return { success: true };
}

export async function updateObjective(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return { error: "Sem permissão" };

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  if (!id || !title) return { error: "ID e título obrigatórios" };

  await prisma.objective.update({
    where: { id },
    data: {
      title,
      description: (formData.get("description") as string) || null,
      targetValue: parseFloat(formData.get("targetValue") as string) || null,
      unit: (formData.get("unit") as string) || null,
      deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null,
      projectId: (formData.get("projectId") as string) || null,
    },
  });

  revalidatePath("/objectives");
  return { success: true };
}

export async function deleteObjective(id: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return { error: "Sem permissão" };

  await prisma.objective.delete({ where: { id } });
  revalidatePath("/objectives");
  return { success: true };
}

// ─── Key Results CRUD ──────────────────────────────────────

export async function createKeyResult(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return { error: "Sem permissão" };

  const objectiveId = formData.get("objectiveId") as string;
  const title = formData.get("title") as string;
  if (!objectiveId || !title) return { error: "Objectivo e título obrigatórios" };

  const maxOrder = await prisma.keyResult.aggregate({
    where: { objectiveId },
    _max: { krOrder: true },
  });

  await prisma.keyResult.create({
    data: {
      objectiveId,
      title,
      targetValue: parseFloat(formData.get("targetValue") as string) || null,
      unit: (formData.get("unit") as string) || null,
      weight: parseInt(formData.get("weight") as string) || 1,
      deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null,
      krOrder: (maxOrder._max.krOrder ?? 0) + 1,
    },
  });

  revalidatePath("/objectives");
  return { success: true };
}

export async function updateKeyResult(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return { error: "Sem permissão" };

  const id = formData.get("id") as string;
  if (!id) return { error: "ID obrigatório" };

  const kr = await prisma.keyResult.update({
    where: { id },
    data: {
      title: (formData.get("title") as string) || undefined,
      targetValue: formData.has("targetValue") ? parseFloat(formData.get("targetValue") as string) || null : undefined,
      currentValue: formData.has("currentValue") ? parseFloat(formData.get("currentValue") as string) || 0 : undefined,
      unit: formData.has("unit") ? (formData.get("unit") as string) || null : undefined,
      weight: formData.has("weight") ? parseInt(formData.get("weight") as string) || 1 : undefined,
      deadline: formData.has("deadline") ? (formData.get("deadline") ? new Date(formData.get("deadline") as string) : null) : undefined,
    },
    select: { id: true, objectiveId: true, currentValue: true },
  });

  await recordSnapshot("key_result", kr.id, Number(kr.currentValue));
  await recalculateObjectiveProgress(kr.objectiveId);

  const obj = await prisma.objective.findUnique({
    where: { id: kr.objectiveId },
    select: { currentValue: true },
  });
  if (obj) await recordSnapshot("objective", kr.objectiveId, Number(obj.currentValue));

  revalidatePath("/objectives");
  return { success: true };
}

export async function deleteKeyResult(id: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return { error: "Sem permissão" };

  const kr = await prisma.keyResult.delete({
    where: { id },
    select: { objectiveId: true },
  });

  await recalculateObjectiveProgress(kr.objectiveId);
  revalidatePath("/objectives");
  return { success: true };
}

// ─── Task linking ──────────────────────────────────────────

export async function linkTaskToKeyResult(taskId: string, keyResultId: string | null) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") return { error: "Sem permissão" };

  await prisma.task.update({
    where: { id: taskId },
    data: { keyResultId },
  });

  revalidatePath("/objectives");
  return { success: true };
}

// ─── Agent-callable: update KR progress ────────────────────

export async function updateKrProgress(krId: string, currentValue: number) {
  const kr = await prisma.keyResult.update({
    where: { id: krId },
    data: { currentValue },
    select: { id: true, objectiveId: true, currentValue: true },
  });

  await recordSnapshot("key_result", kr.id, Number(kr.currentValue));
  await recalculateObjectiveProgress(kr.objectiveId);

  const obj = await prisma.objective.findUnique({
    where: { id: kr.objectiveId },
    select: { currentValue: true },
  });
  if (obj) await recordSnapshot("objective", kr.objectiveId, Number(obj.currentValue));
}
