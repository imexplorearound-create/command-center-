import { z } from "zod";

const code = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[A-Za-z0-9._-]+$/, "Código só pode ter letras, números, . _ -");

const title = z.string().trim().min(1).max(300);
const description = z.string().trim().max(5000).optional().nullable();
const expectedResult = z.string().trim().max(5000).optional().nullable();
const moduleField = z.string().trim().max(100).optional().nullable();

export const testCaseInputSchema = z.object({
  code,
  title,
  description,
  expectedResult,
  module: moduleField,
});

export const createTestSheetSchema = z.object({
  projectSlug: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  cases: z.array(testCaseInputSchema).min(1).max(500),
});

export const addTestCasesSchema = z.object({
  cases: z.array(testCaseInputSchema).min(1).max(500),
});

export const updateTestCaseSchema = z.object({
  title: title.optional(),
  description,
  expectedResult,
  module: moduleField,
});
