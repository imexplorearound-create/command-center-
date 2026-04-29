import { z } from "zod";

export const briefingTriggerSchema = z
  .object({
    tenantId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    force: z.boolean().optional(),
  })
  .strict();

export type BriefingTriggerInput = z.infer<typeof briefingTriggerSchema>;
