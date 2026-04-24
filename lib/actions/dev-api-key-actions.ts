"use server";

import { revalidatePath } from "next/cache";
import { basePrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";
import { firstZodError } from "@/lib/validation/project-schema";
import {
  createDevApiKeySchema,
  revokeDevApiKeySchema,
  updateDevApiKeyLabelSchema,
} from "@/lib/validation/dev-api-key-schema";
import { generateDevApiKey, hashDevApiKey } from "@/lib/dev-api-key";
import { field } from "./form-helpers";
import type { ActionResult } from "./types";

const API_KEYS_PATH = "/settings/api-keys";

export async function createDevApiKeyAction(
  _prev: ActionResult<{ id: string; token: string; prefix: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string; token: string; prefix: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const scopesRaw = formData.getAll("scopes").filter((v): v is string => typeof v === "string");
  const parsed = createDevApiKeySchema.safeParse({
    label: field(formData, "label"),
    personId: field(formData, "personId") || null,
    scopes: scopesRaw,
    expiresAt: field(formData, "expiresAt") || null,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const { token, prefix } = generateDevApiKey();
  let tokenHash: string;
  try {
    tokenHash = hashDevApiKey(token);
  } catch {
    return { error: "Configuração do servidor inválida (DEV_API_KEY_PEPPER)." };
  }

  const key = await basePrisma.devApiKey.create({
    data: {
      tenantId: auth.user.tenantId,
      label: parsed.data.label,
      personId: parsed.data.personId ?? null,
      tokenHash,
      tokenPrefix: prefix,
      scopes: parsed.data.scopes,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
    select: { id: true },
  });

  revalidatePath(API_KEYS_PATH);
  return { success: true, data: { id: key.id, token, prefix } };
}

export async function revokeDevApiKeyAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = revokeDevApiKeySchema.safeParse({ keyId: field(formData, "keyId") });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const result = await basePrisma.devApiKey.updateMany({
    where: {
      id: parsed.data.keyId,
      tenantId: auth.user.tenantId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) return { error: "Chave não encontrada ou já revogada" };

  revalidatePath(API_KEYS_PATH);
  return { success: true };
}

export async function updateDevApiKeyLabelAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const parsed = updateDevApiKeyLabelSchema.safeParse({
    keyId: field(formData, "keyId"),
    label: field(formData, "label"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const result = await basePrisma.devApiKey.updateMany({
    where: { id: parsed.data.keyId, tenantId: auth.user.tenantId },
    data: { label: parsed.data.label },
  });
  if (result.count === 0) return { error: "Chave não encontrada" };

  revalidatePath(API_KEYS_PATH);
  return { success: true };
}
