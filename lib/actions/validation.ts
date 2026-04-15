"use server";

import { getTenantDb } from "@/lib/tenant";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { recordValidation } from "@/lib/maestro/score-engine";
import type { ValidationAction } from "@/lib/maestro/trust-rules";
import type { Tx } from "@/lib/db";

type RunResult = { success: true } | { error: string };

/**
 * Pipeline partilhado pelas 3 acções de validação:
 *  1. auth
 *  2. carrega task pendente
 *  3. ATOMICAMENTE: actualiza task + escreve trust score + escreve MaestroAction
 *  4. revalida paths
 *
 * `apply` recebe os campos de update específicos da acção.
 */
async function runValidation(
  itemId: string,
  action: ValidationAction,
  apply: (task: { title: string }) => {
    validationStatus: string;
    title?: string;
    originalData?: { originalTitle: string };
  }
): Promise<RunResult> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado" };

  const db = await getTenantDb();

  const task = await db.task.findUnique({
    where: { id: itemId },
    select: { id: true, title: true, validationStatus: true, archivedAt: true },
  });
  if (!task) return { error: "Tarefa não encontrada" };
  if (task.archivedAt) return { error: "Tarefa arquivada" };
  if (task.validationStatus !== "por_confirmar") {
    return { error: "Tarefa já validada" };
  }

  const updates = apply(task);
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: itemId },
      data: {
        validationStatus: updates.validationStatus,
        validatedById: session.personId,
        validatedAt: now,
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.originalData !== undefined ? { originalData: updates.originalData } : {}),
      },
    });

    await recordValidation(
      {
        extractionType: "tarefa",
        action,
        entityType: "task",
        entityId: itemId,
        performedById: session.personId,
      },
      tx as unknown as Tx
    );
  });

  revalidatePath("/");
  revalidatePath("/maestro");
  return { success: true };
}

export async function confirmValidation(
  itemId: string,
  itemKind: "task" | "feedback" = "task"
): Promise<RunResult> {
  if (itemKind === "feedback") return runFeedbackValidation(itemId, "confirmar", "accepted");
  return runValidation(itemId, "confirmar", () => ({
    validationStatus: "confirmado",
  }));
}

export async function editValidation(
  itemId: string,
  newTitle: string,
  itemKind: "task" | "feedback" = "task"
): Promise<RunResult> {
  if (itemKind === "feedback") return runFeedbackValidation(itemId, "editar", "accepted", newTitle);
  return runValidation(itemId, "editar", (task) => ({
    validationStatus: "editado",
    title: newTitle,
    originalData: { originalTitle: task.title },
  }));
}

export async function rejectValidation(
  itemId: string,
  itemKind: "task" | "feedback" = "task"
): Promise<RunResult> {
  if (itemKind === "feedback") return runFeedbackValidation(itemId, "rejeitar", "rejected");
  return runValidation(itemId, "rejeitar", () => ({
    validationStatus: "rejeitado",
  }));
}

async function runFeedbackValidation(
  feedbackItemId: string,
  action: ValidationAction,
  newStatus: string,
  editedSummary?: string
): Promise<RunResult> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado" };

  const db = await getTenantDb();

  const item = await db.feedbackItem.findUnique({
    where: { id: feedbackItemId },
    select: { id: true, status: true },
  });
  if (!item) return { error: "Item de feedback não encontrado" };
  if (item.status !== "pending") return { error: "Item já processado" };

  await db.$transaction(async (tx) => {
    await tx.feedbackItem.update({
      where: { id: feedbackItemId },
      data: {
        status: newStatus,
        reviewedById: session.personId,
        reviewedAt: new Date(),
        ...(editedSummary ? { aiSummary: editedSummary } : {}),
      },
    });

    await recordValidation(
      {
        extractionType: "feedback_teste",
        action,
        entityType: "interaction",
        entityId: feedbackItemId,
        performedById: session.personId,
      },
      tx as unknown as Tx
    );
  });

  revalidatePath("/");
  return { success: true };
}
