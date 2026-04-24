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

export type DevTransitionOpts = {
  rejectionReason?: string;
  rejectionOrigin?: RejectionOrigin;
  verifiedById?: string;
};

/**
 * Aplica uma transição de `approvalStatus` a todos os FeedbackItems ligados
 * a uma Task. Partilhado entre a Dev API (Bruno), a UI de verificação (F5)
 * e as actions de aprovação (F3). Uma única `updateMany` atómica.
 *
 * Invariante: feedbacks de uma Task partilham `approvalStatus`. Drift vira
 * 409 (mixed states). Race concorrente (updateMany count != items) → 409.
 *
 * Rejeições são detectadas via `rejectionTargetFor(currentStatus)` — cobre
 * tanto dev reject (in_dev → needs_review) como verifier reject
 * (ready_for_verification → in_dev). O `rejectionOrigin` é preenchido
 * automaticamente a partir do mapping se não for forçado pelo caller.
 * Rejeições `verifier` incrementam `verifyRejectionsCount`.
 */
export async function applyDevTransition(
  db: TenantPrisma,
  taskId: string,
  target: DevTransitionTarget,
  opts: DevTransitionOpts = {},
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

  const rejectionSpec = rejectionTargetFor(currentStatus);
  const isRejection = !!rejectionSpec && rejectionSpec.to === target;

  if (isRejection) {
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

  const effectiveOrigin: RejectionOrigin | null = isRejection
    ? opts.rejectionOrigin ?? rejectionSpec!.origin
    : null;

  const now = new Date();
  const result = await db.feedbackItem.updateMany({
    where: { taskId, approvalStatus: currentStatus },
    data: {
      approvalStatus: target,
      ...(isRejection
        ? {
            rejectionReason: opts.rejectionReason,
            rejectionOrigin: effectiveOrigin,
            ...(effectiveOrigin === "verifier"
              ? { verifyRejectionsCount: { increment: 1 } }
              : {}),
          }
        : {
            rejectionReason: null,
            rejectionOrigin: null,
          }),
      ...(target === "verified"
        ? {
            verifiedAt: now,
            ...(opts.verifiedById ? { verifiedById: opts.verifiedById } : {}),
          }
        : {}),
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
