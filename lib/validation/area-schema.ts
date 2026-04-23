import { z } from "zod";
import { slugify, slugRegex, hexColorRegex } from "./project-schema";

export const areaCreateSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  slug: z
    .string()
    .trim()
    .regex(slugRegex, "Slug só pode ter letras minúsculas, números e hífens")
    .max(100)
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  color: z
    .string()
    .regex(hexColorRegex, "Cor inválida (hex #RRGGBB)")
    .optional()
    .or(z.literal("")),
  icon: z.string().trim().max(50).optional().or(z.literal("")),
  ownerId: z.string().uuid("ID inválido").optional().or(z.literal("")),
});

export type AreaCreateInput = z.infer<typeof areaCreateSchema>;

export const areaUpdateSchema = areaCreateSchema.partial();
export type AreaUpdateInput = z.infer<typeof areaUpdateSchema>;

export { slugify };
