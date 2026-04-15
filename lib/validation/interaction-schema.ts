import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────

export const interactionTypeEnum = z.enum([
  "call",
  "email",
  "decisao",
  "documento",
  "tarefa",
  "nota",
]);
export type InteractionTypeInput = z.infer<typeof interactionTypeEnum>;

// ─── Labels ─────────────────────────────────────────────────

export const INTERACTION_TYPE_LABELS: Record<InteractionTypeInput, string> = {
  call: "Chamada",
  email: "Email",
  decisao: "Decisão",
  documento: "Documento",
  tarefa: "Tarefa",
  nota: "Nota",
};

export const INTERACTION_TYPE_ICONS: Record<InteractionTypeInput, string> = {
  call: "📞",
  email: "📧",
  decisao: "✅",
  documento: "📄",
  tarefa: "📋",
  nota: "📝",
};

export const INTERACTION_TYPE_OPTIONS = interactionTypeEnum.options.map((value) => ({
  value,
  label: INTERACTION_TYPE_LABELS[value],
  icon: INTERACTION_TYPE_ICONS[value],
}));

// ─── Field helpers ──────────────────────────────────────────

const optionalUuid = z.string().uuid("ID inválido").optional().or(z.literal(""));

const datetimeString = z
  .string()
  .min(1, "Data obrigatória")
  .refine((v) => !isNaN(Date.parse(v)), "Data inválida");

// ─── Create ─────────────────────────────────────────────────

export const interactionCreateSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(500),
  type: interactionTypeEnum,
  body: z.string().trim().max(10000).optional().or(z.literal("")),
  interactionDate: datetimeString,
  participants: z.array(z.string().uuid()).optional().default([]),
  source: z.string().trim().max(100).optional().or(z.literal("")),
  sourceRef: z.string().trim().max(2000).optional().or(z.literal("")),
  clientId: z.string().uuid("Client ID obrigatório"),
  projectId: optionalUuid,
});

export type InteractionCreateInput = z.infer<typeof interactionCreateSchema>;

// ─── Update ─────────────────────────────────────────────────

export const interactionUpdateSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  type: interactionTypeEnum.optional(),
  body: z.string().trim().max(10000).optional().or(z.literal("")),
  interactionDate: datetimeString.optional(),
  participants: z.array(z.string().uuid()).optional(),
  source: z.string().trim().max(100).optional().or(z.literal("")),
  sourceRef: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type InteractionUpdateInput = z.infer<typeof interactionUpdateSchema>;
