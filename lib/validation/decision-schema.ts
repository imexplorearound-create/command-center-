import { z } from "zod";

export const decisionKindEnum = z.enum([
  "pipeline_stall",
  "client_reply",
  "bruno_block",
  "budget",
  "feedback_triage",
  "other",
]);
export type DecisionKindInput = z.infer<typeof decisionKindEnum>;

export const decisionSeverityEnum = z.enum(["block", "warn", "pend"]);
export type DecisionSeverityInput = z.infer<typeof decisionSeverityEnum>;

const uuid = z.string().uuid();
const isoDate = z
  .string()
  .datetime({ offset: true })
  .optional()
  .nullable();

export const createDecisionSchema = z.object({
  title: z.string().trim().min(3).max(200),
  context: z.string().trim().max(5000).optional().nullable(),
  kind: decisionKindEnum,
  severity: decisionSeverityEnum,
  crewRoleId: uuid.optional().nullable(),
  dueAt: isoDate,
  projectId: uuid.optional().nullable(),
  opportunityId: uuid.optional().nullable(),
  taskId: uuid.optional().nullable(),
  sourceMaestroActionId: uuid.optional().nullable(),
  feedbackItemId: uuid.optional().nullable(),
});

export const resolveDecisionSchema = z.object({
  decisionId: uuid,
  resolutionNote: z.string().trim().max(1000).optional().nullable(),
});

export const snoozeDecisionSchema = z.object({
  decisionId: uuid,
  snoozedUntil: z.string().datetime({ offset: true }),
});

export const reopenDecisionSchema = z.object({
  decisionId: uuid,
});
