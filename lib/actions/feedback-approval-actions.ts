"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant";
import { requireWriter } from "@/lib/auth/dal";
import { canApproveFeedback, canVerifyFeedback } from "@/lib/auth/roles";
import { firstZodError } from "@/lib/validation/project-schema";
import {
  approveFeedbackSchema,
  rejectFeedbackSchema,
  archiveFeedbackSchema,
} from "@/lib/validation/feedback-approval";
import { findOrCreateOpenTaskForTestCase } from "./find-or-create-open-task";
import { deferTaskDraft } from "./defer-task-draft";
import { applyDevTransition } from "./task-dev-transitions";
import { field } from "./form-helpers";
import type { ActionResult } from "./types";
import {
  verifyFeedbackSchema,
  rejectVerificationSchema,
} from "@/lib/validation/feedback-approval";
import { defer } from "@/lib/utils/defer";
import { notifyFeedbackApproved } from "@/lib/notifications/feedback-approved-notifier";

async function loadItemForApproval(feedbackItemId: string) {
  const db = await getTenantDb();
  const item = await db.feedbackItem.findFirst({
    where: { id: feedbackItemId },
    select: {
      id: true,
      tenantId: true,
      testCaseId: true,
      taskId: true,
      approvalStatus: true,
      priority: true,
      aiSummary: true,
      voiceTranscript: true,
      session: { select: { projectId: true } },
    },
  });
  return { db, item };
}

function buildTitle(item: {
  aiSummary: string | null;
  voiceTranscript: string | null;
}): string {
  const src = (item.aiSummary || item.voiceTranscript || "Feedback").trim();
  return src.slice(0, 200) || "Feedback";
}

export async function approveFeedback(
  _prev: ActionResult<{ taskId: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ taskId: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const parsed = approveFeedbackSchema.safeParse({
    feedbackItemId: field(formData, "feedbackItemId"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const { db, item } = await loadItemForApproval(parsed.data.feedbackItemId);
  if (!item) return { error: "Feedback não encontrado" };
  if (item.approvalStatus !== "needs_review") {
    return { error: `Já foi ${item.approvalStatus} — não pode aprovar de novo` };
  }
  if (!item.testCaseId) {
    return { error: "Atribui um TestCase antes de aprovar" };
  }
  if (!canApproveFeedback(auth.user, { tenantId: item.tenantId, projectId: item.session.projectId })) {
    return { error: "Sem permissão para este projecto" };
  }

  let taskResult;
  try {
    taskResult = await findOrCreateOpenTaskForTestCase(db, {
      tenantId: item.tenantId,
      testCaseId: item.testCaseId,
      projectId: item.session.projectId,
      title: buildTitle(item),
      description: item.voiceTranscript ?? null,
      priority: item.priority ?? "media",
      origin: "feedback",
      originRef: item.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro a criar task";
    return { error: message };
  }

  await db.feedbackItem.update({
    where: { id: item.id },
    data: {
      approvalStatus: "approved",
      approvedById: auth.user.personId,
      approvedAt: new Date(),
      taskId: taskResult.id,
      rejectionReason: null,
      rejectionOrigin: null,
    },
  });

  deferTaskDraft(db, taskResult.id);
  defer("feedback-approved-notify", async () => {
    await notifyFeedbackApproved(db, taskResult.id, auth.user.name);
  });

  revalidatePath("/");
  revalidatePath(`/feedback/${item.id}`);
  return { success: true, data: { taskId: taskResult.id } };
}

export async function rejectFeedback(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const parsed = rejectFeedbackSchema.safeParse({
    feedbackItemId: field(formData, "feedbackItemId"),
    rejectionReason: field(formData, "rejectionReason"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const { db, item } = await loadItemForApproval(parsed.data.feedbackItemId);
  if (!item) return { error: "Feedback não encontrado" };
  if (item.approvalStatus !== "needs_review") {
    return { error: "Só é possível rejeitar feedback em review" };
  }
  if (!canApproveFeedback(auth.user, { tenantId: item.tenantId, projectId: item.session.projectId })) {
    return { error: "Sem permissão" };
  }

  await db.feedbackItem.update({
    where: { id: item.id },
    data: {
      approvalStatus: "archived",
      rejectionReason: parsed.data.rejectionReason,
      rejectionOrigin: null,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function archiveFeedback(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const parsed = archiveFeedbackSchema.safeParse({
    feedbackItemId: field(formData, "feedbackItemId"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const { db, item } = await loadItemForApproval(parsed.data.feedbackItemId);
  if (!item) return { error: "Feedback não encontrado" };
  if (item.approvalStatus === "archived") {
    return { error: "Já está arquivado" };
  }
  if (!canApproveFeedback(auth.user, { tenantId: item.tenantId, projectId: item.session.projectId })) {
    return { error: "Sem permissão" };
  }

  // Desliga da Task mas mantém a Task (ela continua o seu ciclo próprio —
  // se houver outros FeedbackItems ligados, o drafter redesenha descrição
  // sem este). Task arquivada "por arrastamento" fica para F5+.
  await db.feedbackItem.update({
    where: { id: item.id },
    data: {
      approvalStatus: "archived",
      taskId: null,
    },
  });

  revalidatePath("/");
  return { success: true };
}

async function loadItemForVerification(feedbackItemId: string) {
  const db = await getTenantDb();
  const item = await db.feedbackItem.findFirst({
    where: { id: feedbackItemId },
    select: {
      id: true,
      tenantId: true,
      taskId: true,
      approvalStatus: true,
      session: { select: { projectId: true } },
    },
  });
  return { db, item };
}

export async function verifyFeedback(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const parsed = verifyFeedbackSchema.safeParse({
    feedbackItemId: field(formData, "feedbackItemId"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const { db, item } = await loadItemForVerification(parsed.data.feedbackItemId);
  if (!item) return { error: "Feedback não encontrado" };
  if (!item.taskId) return { error: "Feedback sem task ligada" };
  if (!canVerifyFeedback(auth.user, { tenantId: item.tenantId, projectId: item.session.projectId })) {
    return { error: "Sem permissão para este projecto" };
  }

  const result = await applyDevTransition(db, item.taskId, "verified", {
    verifiedById: auth.user.personId,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/verifications");
  revalidatePath("/");
  return { success: true };
}

export async function rejectVerification(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const parsed = rejectVerificationSchema.safeParse({
    feedbackItemId: field(formData, "feedbackItemId"),
    rejectionReason: field(formData, "rejectionReason"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const { db, item } = await loadItemForVerification(parsed.data.feedbackItemId);
  if (!item) return { error: "Feedback não encontrado" };
  if (!item.taskId) return { error: "Feedback sem task ligada" };
  if (!canVerifyFeedback(auth.user, { tenantId: item.tenantId, projectId: item.session.projectId })) {
    return { error: "Sem permissão para este projecto" };
  }

  const result = await applyDevTransition(db, item.taskId, "in_dev", {
    rejectionReason: parsed.data.rejectionReason,
    rejectionOrigin: "verifier",
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/verifications");
  return { success: true };
}
