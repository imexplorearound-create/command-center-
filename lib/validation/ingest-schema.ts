import { z } from "zod";

export const ingestClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  companyName: z.string().optional(),
  nif: z.string().optional(),
  projectSlug: z.string().optional(),
});

export const ingestClientsBodySchema = z.object({
  clients: z.array(ingestClientSchema).min(1).max(500),
});

export const ingestFinancialSchema = z.object({
  projectSlug: z.string().min(1),
  rubricName: z.string().min(1),
  budgetExecuted: z.coerce.number().min(0),
});

export const ingestFinancialsBodySchema = z.object({
  entries: z.array(ingestFinancialSchema).min(1).max(100),
});

export const ingestContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  companyName: z.string().optional(),
  role: z.string().optional(),
  type: z.enum(["equipa", "cliente"]).default("cliente"),
});

export const ingestContactsBodySchema = z.object({
  contacts: z.array(ingestContactSchema).min(1).max(500),
});
