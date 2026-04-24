import { z } from "zod";

export const AVAILABLE_SCOPES = [
  "testsheets:read",
  "testsheets:write",
  "tasks:read",
  "tasks:write",
  "feedback:read",
] as const;

export type DevApiKeyScope = (typeof AVAILABLE_SCOPES)[number];

export const devApiKeyScopeEnum = z.enum(AVAILABLE_SCOPES);

export const createDevApiKeySchema = z.object({
  label: z.string().trim().min(2).max(100),
  personId: z.string().uuid().optional().nullable(),
  scopes: z
    .array(devApiKeyScopeEnum)
    .min(1, "Escolhe pelo menos um scope")
    .max(AVAILABLE_SCOPES.length),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export const revokeDevApiKeySchema = z.object({
  keyId: z.string().uuid(),
});

export const updateDevApiKeyLabelSchema = z.object({
  keyId: z.string().uuid(),
  label: z.string().trim().min(2).max(100),
});
