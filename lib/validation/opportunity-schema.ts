import { z } from "zod";

export const opportunityStageEnum = z.enum([
  "contacto_inicial", "qualificacao", "proposta", "negociacao", "ganho", "perdido",
]);
export type OpportunityStage = z.infer<typeof opportunityStageEnum>;

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  contacto_inicial: "Contacto Inicial",
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

export const OPPORTUNITY_STAGE_OPTIONS = opportunityStageEnum.options.map((value) => ({
  value,
  label: OPPORTUNITY_STAGE_LABELS[value],
}));

// Final stages (deal is closed)
export const FINAL_STAGES: OpportunityStage[] = ["ganho", "perdido"];

export const opportunitySourceEnum = z.enum(["website", "referral", "cold", "event", "other"]);

export const OPPORTUNITY_SOURCE_LABELS: Record<z.infer<typeof opportunitySourceEnum>, string> = {
  website: "Website",
  referral: "Referência",
  cold: "Contacto Frio",
  event: "Evento",
  other: "Outro",
};

export const OPPORTUNITY_SOURCE_OPTIONS = opportunitySourceEnum.options.map((value) => ({
  value,
  label: OPPORTUNITY_SOURCE_LABELS[value],
}));

// Use the same dateString helper from the project if it exists, otherwise:
const optionalDate = z.string().optional().transform((v) => (v ? new Date(v) : null));

export const opportunityCreateSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(500),
  stageId: opportunityStageEnum.default("contacto_inicial"),
  value: z.coerce.number().optional().transform((v) => v ?? null),
  probability: z.coerce.number().min(0).max(100).default(0),
  contactId: z.string().uuid().optional().transform((v) => v || null),
  ownerId: z.string().uuid().optional().transform((v) => v || null),
  companyName: z.string().max(300).optional().transform((v) => v || null),
  companyNif: z.string().max(20).optional().transform((v) => v || null),
  expectedClose: optionalDate,
  source: opportunitySourceEnum.optional().transform((v) => v || null),
});

export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>;

export const opportunityUpdateSchema = opportunityCreateSchema.partial();

export const opportunityMoveSchema = z.object({
  toStage: opportunityStageEnum,
  toIndex: z.number().int().min(0),
});

export const activityTypeEnum = z.enum(["note", "call", "email", "meeting", "task"]);

export const ACTIVITY_TYPE_LABELS: Record<z.infer<typeof activityTypeEnum>, string> = {
  note: "Nota",
  call: "Chamada",
  email: "Email",
  meeting: "Reunião",
  task: "Tarefa",
};

export const activityCreateSchema = z.object({
  opportunityId: z.string().uuid(),
  type: activityTypeEnum,
  title: z.string().trim().min(1, "Título obrigatório").max(500),
  description: z.string().optional().transform((v) => v || null),
  scheduledAt: optionalDate,
});
