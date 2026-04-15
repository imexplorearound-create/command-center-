import { z } from "zod";

// ─── Shared regexes (re-exported for sibling schemas) ──────

export const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

// ─── Project ────────────────────────────────────────────────

export const projectTypeEnum = z.enum(["interno", "cliente"]);
export const projectStatusEnum = z.enum(["ativo", "pausado", "concluido"]);
export const projectHealthEnum = z.enum(["green", "yellow", "red"]);

export type ProjectType = z.infer<typeof projectTypeEnum>;
export type ProjectStatus = z.infer<typeof projectStatusEnum>;
export type ProjectHealth = z.infer<typeof projectHealthEnum>;

/**
 * Gera um slug a partir de um nome humano.
 * "Aura PMS — v2" → "aura-pms-v2"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remover acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  slug: z
    .string()
    .trim()
    .regex(slugRegex, "Slug só pode ter letras minúsculas, números e hífens")
    .max(100)
    .optional()
    .or(z.literal("")),
  type: projectTypeEnum,
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  color: z.string().regex(hexColorRegex, "Cor inválida").optional().or(z.literal("")),
});

export const projectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().regex(slugRegex).max(100).optional(),
  type: projectTypeEnum.optional(),
  status: projectStatusEnum.optional(),
  health: projectHealthEnum.optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  color: z.string().regex(hexColorRegex).optional().or(z.literal("")),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

// ─── Phase ──────────────────────────────────────────────────

export const phaseStatusEnum = z.enum(["pendente", "em_curso", "concluida"]);
export type PhaseStatus = z.infer<typeof phaseStatusEnum>;

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)")
  .optional()
  .or(z.literal(""));

export const phaseCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Nome obrigatório").max(200),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    phaseOrder: z.coerce.number().int().min(0).optional(),
    status: phaseStatusEnum.default("pendente"),
    progress: z.coerce.number().int().min(0).max(100).default(0),
    startDate: dateString,
    endDate: dateString,
  })
  .refine(
    (d) => !d.startDate || !d.endDate || d.endDate >= d.startDate,
    { message: "Data fim deve ser >= data início", path: ["endDate"] }
  );

export const phaseUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    phaseOrder: z.coerce.number().int().min(0).optional(),
    status: phaseStatusEnum.optional(),
    progress: z.coerce.number().int().min(0).max(100).optional(),
    startDate: dateString,
    endDate: dateString,
  })
  .refine(
    (d) => !d.startDate || !d.endDate || d.endDate >= d.startDate,
    { message: "Data fim deve ser >= data início", path: ["endDate"] }
  );

export type PhaseCreateInput = z.infer<typeof phaseCreateSchema>;
export type PhaseUpdateInput = z.infer<typeof phaseUpdateSchema>;

// ─── Helpers ────────────────────────────────────────────────

/**
 * Extrai mensagem de erro do primeiro problema de um ZodError.
 * Útil para devolver `{error: string}` nas Server Actions.
 */
export function firstZodError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos";
}
