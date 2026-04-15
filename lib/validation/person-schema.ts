import { z } from "zod";
import { hexColorRegex } from "./project-schema";

export const personTypeEnum = z.enum(["equipa", "cliente"]);
export type PersonType = z.infer<typeof personTypeEnum>;

export const PERSON_TYPE_LABELS: Record<PersonType, string> = {
  equipa: "Equipa",
  cliente: "Cliente",
};

export const PERSON_TYPE_OPTIONS = personTypeEnum.options.map((value) => ({
  value,
  label: PERSON_TYPE_LABELS[value],
}));

export const personCreateSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(300)
    .optional()
    .or(z.literal("")),
  role: z.string().trim().max(200).optional().or(z.literal("")),
  type: personTypeEnum,
  avatarColor: z
    .string()
    .regex(hexColorRegex, "Cor inválida (hex #RRGGBB)")
    .optional()
    .or(z.literal("")),
  githubUsername: z.string().trim().max(100).optional().or(z.literal("")),
});

export type PersonCreateInput = z.infer<typeof personCreateSchema>;

export const personUpdateSchema = personCreateSchema.partial();
export type PersonUpdateInput = z.infer<typeof personUpdateSchema>;
