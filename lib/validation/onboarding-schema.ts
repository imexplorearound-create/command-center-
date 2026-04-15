import { z } from "zod";

export const onboardingStep1Schema = z.object({
  tenantName: z.string().min(1).max(200),
  logoUrl: z.string().max(500).optional(),
});

export const onboardingStep2Schema = z.object({
  users: z.array(
    z.object({
      name: z.string().min(1).max(200),
      email: z.string().email().max(300),
      role: z.enum(["admin", "manager", "membro"]),
    })
  ),
});

export const onboardingStep3Schema = z.object({
  areas: z.array(
    z.object({
      name: z.string().min(1).max(200),
      slug: z.string().min(1).max(100),
    })
  ),
});

export const onboardingStep4Schema = z.object({
  people: z.array(
    z.object({
      name: z.string().min(1).max(200),
      email: z.string().email().max(300).optional(),
      role: z.string().max(200).optional(),
      type: z.enum(["equipa", "contacto"]).default("equipa"),
    })
  ),
});

export const onboardingStep5Schema = z.object({
  enabledModules: z.array(z.string().min(1).max(50)),
});
