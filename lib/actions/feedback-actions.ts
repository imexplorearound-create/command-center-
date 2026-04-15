"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireAdmin } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./types";
import type { FeedbackClassification, FeedbackItemStatus, FeedbackSessionStatus } from "@/lib/types";

// ─── Classify Item ──────────────────────────────────────────

export async function classifyFeedbackItem(
  id: string,
  classification: FeedbackClassification
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const item = await db.feedbackItem.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!item) return { error: "Item não encontrado" };

  await db.feedbackItem.update({
    where: { id },
    data: { classification, reviewedAt: new Date(), reviewedById: auth.user.personId },
  });

  revalidatePath("/feedback");
  return { success: true };
}

// ─── Update Item Status ─────────────────────────────────────

export async function updateFeedbackItemStatus(
  id: string,
  status: FeedbackItemStatus
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  await db.feedbackItem.update({
    where: { id },
    data: { status, reviewedAt: new Date(), reviewedById: auth.user.personId },
  });

  revalidatePath("/feedback");
  return { success: true };
}

// ─── Convert to Task ────────────────────────────────────────

export async function convertFeedbackToTask(
  id: string
): Promise<ActionResult<{ taskId: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const item = await db.feedbackItem.findUnique({
    where: { id },
    include: {
      session: { select: { projectId: true, testerName: true, project: { select: { slug: true } } } },
    },
  });
  if (!item) return { error: "Item não encontrado" };
  if (item.taskId) return { error: "Já convertido em tarefa" };

  const title = item.voiceTranscript
    ? item.voiceTranscript.slice(0, 100) + (item.voiceTranscript.length > 100 ? "..." : "")
    : `Feedback: ${item.pageTitle ?? item.pageUrl ?? "sem contexto"}`;

  const description = [
    item.voiceTranscript && `**Transcrição:** ${item.voiceTranscript}`,
    item.pageUrl && `**Página:** ${item.pageUrl}`,
    item.classification && `**Classificação:** ${item.classification}`,
    `**Tester:** ${item.session.testerName}`,
  ]
    .filter(Boolean)
    .join("\n");

  const task = await db.task.create({
    data: {
      tenantId: "",
      title,
      description,
      projectId: item.session.projectId,
      status: "backlog",
      priority: item.priority ?? "media",
      origin: "feedback",
    },
  });

  await db.feedbackItem.update({
    where: { id },
    data: {
      taskId: task.id,
      status: "converted",
      reviewedAt: new Date(),
      reviewedById: auth.user.personId,
    },
  });

  revalidatePath("/feedback");
  if (item.session.project.slug) {
    revalidatePath(`/project/${item.session.project.slug}`);
  }
  return { success: true, data: { taskId: task.id } };
}

// ─── Update Session Status ──────────────────────────────────

export async function updateSessionStatus(
  id: string,
  status: FeedbackSessionStatus
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  await db.feedbackSession.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/feedback");
  return { success: true };
}
