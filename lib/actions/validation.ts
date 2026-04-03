"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

// ─── Trust Score Recalculation ─────────────────────────────

async function recalcTrustScore(extractionType: string) {
  const score = await prisma.trustScore.findUnique({
    where: { extractionType },
  });
  if (!score) return;

  const total =
    score.totalConfirmations + score.totalEdits + score.totalRejections;
  if (total === 0) return;

  // Score formula: confirmations add points, edits are neutral, rejections subtract
  // Range 0-100, weighted by recency (more recent actions weigh more)
  const raw =
    ((score.totalConfirmations * 2 - score.totalRejections * 3) / (total * 2)) *
    100;
  const clamped = Math.max(0, Math.min(100, Math.round(raw)));

  await prisma.trustScore.update({
    where: { extractionType },
    data: { score: clamped, lastInteractionAt: new Date() },
  });
}

// ─── Validation Actions ────────────────────────────────────

export async function confirmValidation(itemId: string) {
  const session = await getSession();
  if (!session) return { error: "Não autenticado" };

  const task = await prisma.task.findUnique({
    where: { id: itemId },
    select: { id: true, validationStatus: true },
  });
  if (!task || task.validationStatus !== "por_confirmar") {
    return { error: "Item não encontrado ou já processado" };
  }

  await prisma.task.update({
    where: { id: itemId },
    data: {
      validationStatus: "confirmado",
      validatedById: session.personId,
      validatedAt: new Date(),
    },
  });

  await prisma.trustScore.updateMany({
    where: { extractionType: "tarefa" },
    data: { totalConfirmations: { increment: 1 } },
  });
  await recalcTrustScore("tarefa");

  revalidatePath("/");
  return { success: true };
}

export async function editValidation(itemId: string, newTitle: string) {
  const session = await getSession();
  if (!session) return { error: "Não autenticado" };

  const task = await prisma.task.findUnique({
    where: { id: itemId },
    select: { id: true, title: true, validationStatus: true },
  });
  if (!task || task.validationStatus !== "por_confirmar") {
    return { error: "Item não encontrado ou já processado" };
  }

  await prisma.task.update({
    where: { id: itemId },
    data: {
      title: newTitle,
      validationStatus: "editado",
      validatedById: session.personId,
      validatedAt: new Date(),
      originalData: { originalTitle: task.title },
    },
  });

  await prisma.trustScore.updateMany({
    where: { extractionType: "tarefa" },
    data: { totalEdits: { increment: 1 } },
  });
  await recalcTrustScore("tarefa");

  revalidatePath("/");
  return { success: true };
}

export async function rejectValidation(itemId: string) {
  const session = await getSession();
  if (!session) return { error: "Não autenticado" };

  const task = await prisma.task.findUnique({
    where: { id: itemId },
    select: { id: true, validationStatus: true },
  });
  if (!task || task.validationStatus !== "por_confirmar") {
    return { error: "Item não encontrado ou já processado" };
  }

  await prisma.task.update({
    where: { id: itemId },
    data: {
      validationStatus: "rejeitado",
      validatedById: session.personId,
      validatedAt: new Date(),
    },
  });

  await prisma.trustScore.updateMany({
    where: { extractionType: "tarefa" },
    data: { totalRejections: { increment: 1 } },
  });
  await recalcTrustScore("tarefa");

  revalidatePath("/");
  return { success: true };
}
