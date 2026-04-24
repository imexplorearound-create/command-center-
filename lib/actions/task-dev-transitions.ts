import "server-only";
import type { TenantPrisma } from "@/lib/db";
import {
  isTransitionAllowed,
  rejectionTargetFor,
  type ApprovalStatus,
  type RejectionOrigin,
} from "@/lib/validation/feedback-approval";

export type DevTransitionTarget =
  | "in_dev"
  | "ready_for_verification"
  | "verified"
  | "needs_review";

export type DevTransitionResult =
  | { ok: true; newStatus: ApprovalStatus; affected: number }
  | { ok: false; status: number; error: string };

/**
 * Mutação partilhada entre a Dev API (Bruno → PATCH) e a UI de verificação
 * (F5). Aplica a transição a TODOS os FeedbackItems ligados à Task, numa
 * única updateMany. Rejeições guardam `rejectionReason` e `rejectionOrigin`.
 *
 * Invariante simplificado: todos os feedbacks de uma Task estão no mesmo
 * approvalStatus (partilham o ciclo). Se algum não estiver, a updateMany
 * filtra por `approvalStatus = currentStatus` e `affected < items.length`
 * indica drift — tratamos como 409.
 */
export async function applyDevTransition(
  db: TenantPrisma,
  taskId: string,
  target: DevTransitionTarget,
  opts: { rejectionReason?: string; rejectionOrigin?: RejectionOrigin } = {},
): Promise<DevTransitionResult> {
  const task = await db.task.findFirst({
    where: { id: taskId, archivedAt: null },
    select: { id: true },
  });
  if (!task) {
    return { ok: false, status: 404, error: "Task not found or archived" };
  }
  const items = await db.feedbackItem.findMany({
    where: { taskId, approvalStatus: { not: "archived" } },
    select: { id: true, approvalStatus: true },
  });
  if (items.length === 0) {
    return { ok: false, status: 404, error: "Task has no active feedback items" };
  }

  const currentStatuses = new Set(items.map((i) => i.approvalStatus));
  if (currentStatuses.size > 1) {
    return {
      ok: false,
      status: 409,
      error: `Feedback items are in mixed states: ${[...currentStatuses].join(", ")}`,
    };
  }
  const currentStatus = [...currentStatuses][0] as ApprovalStatus;

  const isRejection = target === "needs_review";
  if (isRejection) {
    const allowed = rejectionTargetFor(currentStatus);
    if (!allowed || allowed.to !== "needs_review") {
      return {
        ok: false,
        status: 409,
        error: `Cannot reject from state '${currentStatus}'`,
      };
    }
    if (!opts.rejectionReason) {
      return { ok: false, status: 400, error: "rejectionReason required on reject" };
    }
  } else if (!isTransitionAllowed(currentStatus, target)) {
    return {
      ok: false,
      status: 409,
      error: `Invalid transition: ${currentStatus} → ${target}`,
    };
  }

  const now = new Date();
  const result = await db.feedbackItem.updateMany({
    where: { taskId, approvalStatus: currentStatus },
    data: {
      approvalStatus: target,
      ...(isRejection
        ? {
            rejectionReason: opts.rejectionReason,
            rejectionOrigin: opts.rejectionOrigin ?? "dev",
          }
        : {
            rejectionReason: null,
            rejectionOrigin: null,
          }),
      ...(target === "verified" ? { verifiedAt: now } : {}),
    },
  });

  if (result.count !== items.length) {
    return {
      ok: false,
      status: 409,
      error: "Concurrent modification detected — retry",
    };
  }

  return { ok: true, newStatus: target as ApprovalStatus, affected: result.count };
}
