import { z } from "zod";

export const timeEntryStatusEnum = z.enum(["draft", "submitted", "approved", "rejected"]);
export type TimeEntryStatus = z.infer<typeof timeEntryStatusEnum>;

export const TIME_ENTRY_STATUS_LABELS: Record<TimeEntryStatus, string> = {
  draft: "Rascunho",
  submitted: "Submetido",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

export const timeEntryOriginEnum = z.enum(["manual", "timer"]);

export const timeEntryCreateSchema = z.object({
  taskId: z.string().uuid().optional().transform((v) => v || null),
  projectId: z.string().uuid().optional().transform((v) => v || null),
  areaId: z.string().uuid().optional().transform((v) => v || null),
  date: z.string().min(1, "Data obrigatória").transform((v) => new Date(v)),
  duration: z.coerce.number().int().min(1, "Duração mínima: 1 minuto"),
  description: z.string().optional().transform((v) => v || null),
  isBillable: z.coerce.boolean().default(true),
});

export type TimeEntryCreateInput = z.infer<typeof timeEntryCreateSchema>;

export const timeEntryUpdateSchema = timeEntryCreateSchema.partial();
