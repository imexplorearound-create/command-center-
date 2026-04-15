"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
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
    select: { voiceAudioUrl: true },
  });

  await db.feedbackSession.delete({ where: { id } });

  const publicDir = path.join(process.cwd(), "public");
  for (const it of items) {
    if (!it.voiceAudioUrl) continue;
    const rel = it.voiceAudioUrl.replace(/^\//, "");
    const abs = path.join(publicDir, rel);
    if (!abs.startsWith(publicDir)) continue;
    try {
      await fs.unlink(abs);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("deleteSession: failed to unlink", abs, err);
      }
    }
  }

  revalidatePath("/feedback");
  return { success: true };
}
