import { z } from "zod";

export const fundingSourceEnum = z.enum(["PRR", "PT2030", "proprio", "misto", "outro"]);

export const FUNDING_SOURCE_LABELS: Record<z.infer<typeof fundingSourceEnum>, string> = {
  PRR: "PRR",
  PT2030: "PT 2030",
  proprio: "Próprio",
  misto: "Misto",
  outro: "Outro",
};

export const FUNDING_SOURCE_OPTIONS = fundingSourceEnum.options.map((v) => ({
  value: v,
  label: FUNDING_SOURCE_LABELS[v],
}));

const optionalDate = z.string().optional().transform((v) => (v ? new Date(v) : null));

export const investmentMapCreateSchema = z.object({
  projectId: z.string().uuid(),
  totalBudget: z.coerce.number().min(0, "Orçamento deve ser positivo"),
  fundingSource: fundingSourceEnum.optional().transform((v) => v || null),
  fundingPercentage: z.coerce.number().min(0).max(100).optional().transform((v) => v ?? null),
  startDate: optionalDate,
  endDate: optionalDate,
});

export const investmentMapUpdateSchema = investmentMapCreateSchema.partial().omit({ projectId: true });

export const investmentRubricCreateSchema = z.object({
  investmentMapId: z.string().uuid(),
  name: z.string().trim().min(1, "Nome obrigatório").max(300),
  budgetAllocated: z.coerce.number().min(0),
  areaId: z.string().uuid().optional().transform((v) => v || null),
  sortOrder: z.coerce.number().int().default(0),
});

export const investmentRubricUpdateSchema = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  budgetAllocated: z.coerce.number().min(0).optional(),
  budgetExecuted: z.coerce.number().min(0).optional(),
  areaId: z.string().uuid().optional().transform((v) => v || null),
  sortOrder: z.coerce.number().int().optional(),
});
