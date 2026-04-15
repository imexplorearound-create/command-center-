import { z } from "zod";

export const emailCategorizationSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().optional().transform((v) => v || null),
  clientId: z.string().uuid().optional().transform((v) => v || null),
  personId: z.string().uuid().optional().transform((v) => v || null),
  opportunityId: z.string().uuid().optional().transform((v) => v || null),
});

export const emailFilterSchema = z.object({
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  isProcessed: z.coerce.boolean().optional(),
  validationStatus: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type EmailFilters = z.infer<typeof emailFilterSchema>;
