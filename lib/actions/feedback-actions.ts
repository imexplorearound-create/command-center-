"use server";

import { Prisma } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getTenantDb } from "@/lib/tenant";
import { requireAdmin, requireManager } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./types";
import type { FeedbackClassification, FeedbackItemStatus, FeedbackSessionStatus } from "@/lib/types";
import { triageFieldsSchema, type TriageFieldsInput } from "@/lib/validation/feedback-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import { parseAcceptanceCriteria } from "@/lib/feedback-utils";
import { HANDOFF_STATUS } from "@/lib/handoff-status";

async function unlinkAssetIfSafe(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const publicDir = path.join(process.cwd(), "public");
  const abs = path.join(publicDir, url.replace(/^\//, ""));
  if (!abs.startsWith(publicDir + path.sep)) return;
  try {
    await fs.unlink(abs);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("feedback unlink failed", abs, err);
    }
  }
}

// ─── Classify Item ──────────────────────────────────────────

export async function classifyFeedbackItem(
  id: string,
  classification: FeedbackClassification
): Promise<ActionResult> {
  const auth = await requireManager();
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
  const auth = await requireManager();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  await db.feedbackItem.update({
    where: { id },
    data: { status, reviewedAt: new Date(), reviewedById: auth.user.personId },
  });

  revalidatePath("/feedback");
  return { success: true };
}

// ─── Triagem ────────────────────────────────────────────────

export async function updateFeedbackItemTriage(
  id: string,
  data: TriageFieldsInput
): Promise<ActionResult> {
  const auth = await requireManager();
  if (!auth.ok) return { error: auth.error };

  const parsed = triageFieldsSchema.safeParse(data);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();

  try {
    const updated = await db.feedbackItem.update({
      where: { id },
      data: {
        priority: parsed.data.priority,
        classification: parsed.data.classification ?? undefined,
        module: parsed.data.module ?? undefined,
        expectedResult: parsed.data.expectedResult ?? null,
        actualResult: parsed.data.actualResult ?? null,
        reproSteps: parsed.data.reproSteps,
        acceptanceCriteria: parsed.data.acceptanceCriteria,
        triagedAt: new Date(),
        triagedById: auth.user.personId,
      },
      select: { sessionId: true },
    });
    revalidatePath("/feedback");
    revalidatePath(`/feedback/${updated.sessionId}`);
    return { success: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { error: "Item não encontrado" };
    }
    throw err;
  }
}

// ─── Convert to Task ────────────────────────────────────────

export async function convertFeedbackToTask(
  id: string
): Promise<ActionResult<{ taskId: string }>> {
  const auth = await requireManager();
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
  if (!item.priority) return { error: "Precisa de triagem: define a severidade antes de converter em tarefa" };

  const title = item.voiceTranscript
    ? item.voiceTranscript.slice(0, 100) + (item.voiceTranscript.length > 100 ? "..." : "")
    : `Feedback: ${item.pageTitle ?? item.pageUrl ?? "sem contexto"}`;

  const criteria = parseAcceptanceCriteria(item.acceptanceCriteria);
  const description = [
    item.expectedResult && `**Resultado esperado:** ${item.expectedResult}`,
    item.actualResult && `**Resultado actual:** ${item.actualResult}`,
    item.reproSteps.length > 0 && `**Passos:**\n${item.reproSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    criteria.length > 0 && `**Critérios de aceitação:**\n${criteria.map((c) => `- [${c.done ? "x" : " "}] ${c.text}`).join("\n")}`,
    item.voiceTranscript && `**Transcrição:** ${item.voiceTranscript}`,
    item.pageUrl && `**Página:** ${item.pageUrl}`,
    item.classification && `**Classificação:** ${item.classification}`,
    item.screenshotUrl && `**Screenshot:** ${item.screenshotUrl}`,
    `**Tester:** ${item.session.testerName}`,
  ]
    .filter(Boolean)
    .join("\n\n");

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

// ─── Enviar ao produtor (handoff) ───────────────────────────

export async function sendItemToProducer(
  itemId: string,
  agentId = "bruno"
): Promise<ActionResult<{ taskId: string }>> {
  const auth = await requireManager();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const item = await db.feedbackItem.findUnique({
    where: { id: itemId },
    select: { id: true, taskId: true, priority: true, sessionId: true },
  });
  if (!item) return { error: "Item não encontrado" };
  if (!item.priority) {
    return { error: "Precisa de triagem: define a severidade antes de enviar ao produtor" };
  }

  let taskId: string;
  if (item.taskId) {
    taskId = item.taskId;
  } else {
    const converted = await convertFeedbackToTask(itemId);
    if ("error" in converted) return { error: converted.error };
    if (!converted.data) return { error: "Falha ao converter em tarefa" };
    taskId = converted.data.taskId;
  }

  // Reset do histórico de handoff: um item rejeitado pode ser reenviado
  // do zero, e um "queued" actual pode ser re-queued caso haja nova info.
  await db.task.update({
    where: { id: taskId },
    data: {
      handoffStatus: HANDOFF_STATUS.QUEUED,
      handoffAgentId: agentId,
      handoffSentAt: new Date(),
      handoffClaimedAt: null,
      handoffResolvedAt: null,
      handoffResolution: Prisma.JsonNull,
    },
  });

  revalidatePath("/feedback");
  revalidatePath(`/feedback/${item.sessionId}`);
  return { success: true, data: { taskId } };
}

// ─── Archive / Unarchive / Delete Item ──────────────────────

async function setFeedbackItemArchiveState(
  id: string,
  archivedAt: Date | null
): Promise<ActionResult> {
  const auth = await requireManager();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  try {
    const updated = await db.feedbackItem.update({
      where: { id },
      data: { archivedAt },
      select: { sessionId: true },
    });
    revalidatePath("/feedback");
    revalidatePath(`/feedback/${updated.sessionId}`);
    return { success: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { error: "Item não encontrado" };
    }
    throw err;
  }
}

export async function archiveFeedbackItem(id: string): Promise<ActionResult> {
  return setFeedbackItemArchiveState(id, new Date());
}

export async function unarchiveFeedbackItem(id: string): Promise<ActionResult> {
  return setFeedbackItemArchiveState(id, null);
}

// Delete exige admin: é destrutivo, faz unlink de áudio+screenshots do disco
// e impossibilita restaurar. Archive resolve a maioria dos casos e é manager.
export async function deleteFeedbackItem(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const item = await db.feedbackItem.findUnique({
    where: { id },
    select: {
      sessionId: true,
      voiceAudioUrl: true,
      screenshotUrl: true,
      taskId: true,
    },
  });
  if (!item) return { error: "Item não encontrado" };
  if (item.taskId) {
    return {
      error: "Item está ligado a uma tarefa. Arquiva em vez de apagar, ou apaga primeiro a tarefa.",
    };
  }

  await db.feedbackItem.delete({ where: { id } });
  await Promise.all([
    unlinkAssetIfSafe(item.voiceAudioUrl),
    unlinkAssetIfSafe(item.screenshotUrl),
  ]);

  revalidatePath("/feedback");
  revalidatePath(`/feedback/${item.sessionId}`);
  return { success: true };
}

// ─── Update Session Status ──────────────────────────────────

export async function updateSessionStatus(
  id: string,
  status: FeedbackSessionStatus
): Promise<ActionResult> {
  const auth = await requireManager();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  await db.feedbackSession.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/feedback");
  return { success: true };
}

// ─── Archive / Unarchive Session ────────────────────────────

export async function archiveSession(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  await db.feedbackSession.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/feedback");
  return { success: true };
}

export async function unarchiveSession(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  await db.feedbackSession.update({
    where: { id },
    data: { archivedAt: null },
  });

  revalidatePath("/feedback");
  return { success: true };
}

// ─── Delete Session (permanent, also unlinks audio files) ───

export async function deleteSession(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const items = await db.feedbackItem.findMany({
    where: { sessionId: id },
    select: { voiceAudioUrl: true, screenshotUrl: true },
  });

  await db.feedbackSession.delete({ where: { id } });
  await Promise.all(
    items.flatMap((it) => [
      unlinkAssetIfSafe(it.voiceAudioUrl),
      unlinkAssetIfSafe(it.screenshotUrl),
    ])
  );

  revalidatePath("/feedback");
  return { success: true };
}
