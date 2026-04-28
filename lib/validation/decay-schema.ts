import { z } from "zod";

export const decayInputSchema = z
  .object({
    tenantId: z.string().uuid().optional(),
    dryRun: z.boolean().optional(),
    cooldownDays: z.number().int().min(1).max(365).optional(),
  })
  .strict();

export type DecayInput = z.infer<typeof decayInputSchema>;
