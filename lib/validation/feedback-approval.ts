import { z } from "zod";

/**
 * Ciclo de vida do FeedbackItem (coluna `approval_status`). Distinto do
 * `Task.status` (kanban) porque serve audiências diferentes: tester/cliente
 * (via approvalStatus) vs dev a arrastar cards (via Task.status).
 */
export const approvalStatusEnum = z.enum([
  "needs_review",
  "approved",
  "in_dev",
  "ready_for_verification",
  "verified",
  "archived",
]);
export type ApprovalStatus = z.infer<typeof approvalStatusEnum>;

export const rejectionOriginEnum = z.enum(["dev", "verifier"]);
export type RejectionOrigin = z.infer<typeof rejectionOriginEnum>;

/**
 * Rejeições são transições para trás + `rejectionReason` — capturadas em
 * `REJECTION_TRANSITIONS`, não estados próprios (1 contador, 1 UI).
 * `archived` é sempre alcançável e não tem saída.
 */
export const ALLOWED_TRANSITIONS: Record<ApprovalStatus, readonly ApprovalStatus[]> = {
  needs_review: ["approved", "archived"],
  approved: ["in_dev", "archived"],
  in_dev: ["ready_for_verification", "archived"],
  ready_for_verification: ["verified", "archived"],
  verified: ["archived"],
  archived: [],
};

export const REJECTION_TRANSITIONS: Record<
  ApprovalStatus,
  { to: ApprovalStatus; origin: RejectionOrigin } | null
> = {
  needs_review: null,
  approved: null,
  in_dev: { to: "needs_review", origin: "dev" },
  ready_for_verification: { to: "in_dev", origin: "verifier" },
  verified: null,
  archived: null,
};

export function isTransitionAllowed(from: ApprovalStatus, to: ApprovalStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function rejectionTargetFor(from: ApprovalStatus) {
  return REJECTION_TRANSITIONS[from];
}

const feedbackItemIdSchema = z.object({
  feedbackItemId: z.string().uuid(),
});

const rejectionReasonField = {
  rejectionReason: z.string().trim().min(3).max(2000),
};

export const approveFeedbackSchema = feedbackItemIdSchema;
export const archiveFeedbackSchema = feedbackItemIdSchema;
export const verifyFeedbackSchema = feedbackItemIdSchema;
export const rejectFeedbackSchema = feedbackItemIdSchema.extend(rejectionReasonField);
export const rejectVerificationSchema = feedbackItemIdSchema.extend(rejectionReasonField);
