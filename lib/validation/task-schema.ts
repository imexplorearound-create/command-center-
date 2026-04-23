import { z } from "zod";
import { dateString } from "./project-schema";

// ─── Enums ──────────────────────────────────────────────────

export const taskStatusEnum = z.enum([
  "backlog",
  "a_fazer",
  "em_curso",
  "em_revisao",
  "feito",
]);
export type TaskStatusInput = z.infer<typeof taskStatusEnum>;

export const taskPriorityEnum = z.enum(["critica", "alta", "media", "baixa"]);
export type TaskPriorityInput = z.infer<typeof taskPriorityEnum>;

export const validationStatusEnum = z.enum([
  "por_confirmar",
  "auto_confirmado",
  "confirmed",
  "edited",
  "rejected",
]);
export type ValidationStatusInput = z.infer<typeof validationStatusEnum>;

// ─── Labels (single source of truth) ───────────────────────

export const TASK_STATUS_LABELS: Record<TaskStatusInput, string> = {
  backlog: "Backlog",
  a_fazer: "A Fazer",
  em_curso: "Em Curso",
  em_revisao: "Em Revisão",
  feito: "Feito",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriorityInput, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const TASK_STATUS_OPTIONS = taskStatusEnum.options.map((value) => ({
  value,
  label: TASK_STATUS_LABELS[value],
}));

export const TASK_PRIORITY_OPTIONS = taskPriorityEnum.options.map((value) => ({
  value,
  label: TASK_PRIORITY_LABELS[value],
}));

// ─── Field helpers ─────────────────────────────────────────

const optionalUuid = z.string().uuid("ID inválido").optional().or(z.literal(""));

// ─── Create ─────────────────────────────────────────────────

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(500),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  projectId: optionalUuid,
  phaseId: optionalUuid,
  areaId: optionalUuid,
  assigneeId: optionalUuid,
  status: taskStatusEnum.default("backlog"),
  priority: taskPriorityEnum.default("media"),
  deadline: dateString,
  origin: z.string().trim().max(100).optional().or(z.literal("")),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;

// ─── Update ─────────────────────────────────────────────────

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  phaseId: optionalUuid,
  areaId: optionalUuid,
  assigneeId: optionalUuid,
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  deadline: dateString,
});

export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

// ─── Move (drag & drop) ─────────────────────────────────────

export const taskMoveSchema = z.object({
  toStatus: taskStatusEnum,
  toIndex: z.coerce.number().int().min(0),
});

export type TaskMoveInput = z.infer<typeof taskMoveSchema>;

// ─── Helpers ────────────────────────────────────────────────

/** Converte string vazia em null. Útil para FormData. */
export function emptyToNull<T extends string | undefined>(v: T): T | null {
  return v === "" || v === undefined ? null : v;
}
