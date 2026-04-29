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

// Aceita tanto ISO com offset ("2026-05-01T12:00:00Z") como o formato do
// <input type="datetime-local"> ("2026-05-01T12:00" sem TZ, interpretado
// como local time). Converte tudo para Date para a server action.
const optionalDateTime = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

export const createDevApiKeySchema = z.object({
  label: z.string().trim().min(2).max(100),
  personId: z.string().uuid().optional().nullable(),
  scopes: z
    .array(devApiKeyScopeEnum)
    .min(1, "Escolhe pelo menos um scope")
    .max(AVAILABLE_SCOPES.length),
  expiresAt: optionalDateTime,
});

export const revokeDevApiKeySchema = z.object({
  keyId: z.string().uuid(),
});

export const updateDevApiKeyLabelSchema = z.object({
  keyId: z.string().uuid(),
  label: z.string().trim().min(2).max(100),
});
