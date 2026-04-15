import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────

export const feedbackSessionStatusEnum = z.enum([
  "processing",
  "ready",
  "reviewed",
  "archived",
]);

export const feedbackItemTypeEnum = z.enum([
  "voice_note",
  "interaction_anomaly",
  "navigation_issue",
]);

export const feedbackClassificationEnum = z.enum([
  "bug",
  "suggestion",
  "question",
  "praise",
]);

export const feedbackItemStatusEnum = z.enum([
  "pending",
  "accepted",
  "rejected",
  "converted",
]);

// ─── Create Session ─────────────────────────────────────────

export const createFeedbackSessionSchema = z.object({
  projectSlug: z.string().min(1, "Projeto obrigatório"),
  testerName: z.string().min(1, "Nome do tester obrigatório").max(200),
  startUrl: z.string().url().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  pagesVisited: z.array(z.string()).default([]),
  eventsJson: z.unknown().optional(),
  voiceNotes: z
    .array(
      z.object({
        timestampMs: z.number(),
        cursorPosition: z.object({ x: z.number(), y: z.number() }).optional(),
        pageUrl: z.string().optional(),
        pageTitle: z.string().max(300).optional(),
        transcript: z.string().optional(),
        audioUrl: z.string().optional(),
      })
    )
    .default([]),
});

export type CreateFeedbackSessionInput = z.infer<typeof createFeedbackSessionSchema>;

export const feedbackPriorityEnum = z.enum(["alta", "media", "baixa"]);

// ─── Update Item ────────────────────────────────────────────

export const updateFeedbackItemSchema = z.object({
  status: feedbackItemStatusEnum.optional(),
  classification: feedbackClassificationEnum.optional(),
  module: z.string().max(100).optional(),
  priority: feedbackPriorityEnum.optional(),
});

export type UpdateFeedbackItemInput = z.infer<typeof updateFeedbackItemSchema>;

// ─── Convert Item to Task ───────────────────────────────────

export const convertItemToTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  priority: z.enum(["critica", "alta", "media", "baixa"]).optional(),
  assigneeId: z.string().uuid().optional(),
  phaseId: z.string().uuid().optional(),
});

export type ConvertItemToTaskInput = z.infer<typeof convertItemToTaskSchema>;

// ─── Voice Note Upload (one-shot endpoint) ─────────────────

export const voiceNoteUploadSchema = z.object({
  sessionId: z.string().uuid().optional(),
  projectSlug: z.string().min(1, "Projeto obrigatório"),
  // testerName é opcional: quando o caller é um tester autenticado por JWT, o
  // nome vem do token (verificado) e este campo é ignorado. Continua a ser
  // aceite para manter compat com agentes OpenClaw que enviam o nome no body.
  testerName: z.string().min(1).max(200).optional(),
  pageUrl: z.string().max(2000).optional(),
  pageTitle: z.string().max(300).optional(),
  timestampMs: z.coerce.number().int().min(0),
  cursorX: z.coerce.number().optional(),
  cursorY: z.coerce.number().optional(),
});

export type VoiceNoteUploadInput = z.infer<typeof voiceNoteUploadSchema>;

// ─── Update Session ─────────────────────────────────────────

export const updateFeedbackSessionSchema = z.object({
  status: feedbackSessionStatusEnum.optional(),
  endedAt: z.string().datetime().optional(),
  pagesVisited: z.array(z.string()).optional(),
});

export type UpdateFeedbackSessionInput = z.infer<typeof updateFeedbackSessionSchema>;
