"use server";

import { getTenantDb, getTenantId } from "@/lib/tenant";
import { basePrisma } from "@/lib/db";
import { requireAdmin, requireWriter } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { llmConfigSchema } from "@/lib/validation/llm-config-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import type { ActionResult } from "./types";
import { field } from "./form-helpers";
import { invalidateLLMCache } from "@/lib/maestro/gateway";
import { generateLinkCode } from "@/lib/integrations/telegram-bot";
import crypto from "crypto";
import { getEncryptionKey } from "@/lib/env";

// Simple AES-256-GCM encryption for API keys at rest
function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

// ─── LLM Config ────────────────────────────────────────────

export async function saveLLMConfig(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    provider: field(formData, "provider") ?? "minimax",
    endpoint: field(formData, "endpoint") || undefined,
    model: field(formData, "model") ?? "default",
    apiKey: field(formData, "apiKey") || undefined,
    maxTokens: Number(field(formData, "maxTokens") || 4096),
    temperature: Number(field(formData, "temperature") || 0.7),
  };

  const parsed = llmConfigSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const tenantId = await getTenantId();

  await basePrisma.tenantLLMConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      provider: data.provider,
      endpoint: data.endpoint ?? null,
      model: data.model,
      apiKeyEncrypted: data.apiKey ? encryptApiKey(data.apiKey) : null,
      maxTokens: data.maxTokens,
      temperature: data.temperature,
    },
    update: {
      provider: data.provider,
      endpoint: data.endpoint ?? null,
      model: data.model,
      ...(data.apiKey ? { apiKeyEncrypted: encryptApiKey(data.apiKey) } : {}),
      maxTokens: data.maxTokens,
      temperature: data.temperature,
    },
  });

  // Clear cached provider so next request uses new config
  invalidateLLMCache(tenantId);

  revalidatePath("/settings/llm");
  return { success: true };
}

// ─── Notification Preferences ──────────────────────────────

export async function saveNotificationPrefs(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const prefsJson = field(formData, "prefs");
  if (!prefsJson) return { error: "Preferências obrigatórias" };

  let prefs: unknown;
  try {
    prefs = JSON.parse(prefsJson);
  } catch {
    return { error: "Formato inválido" };
  }

  const db = await getTenantDb();
  await db.user.update({
    where: { id: auth.user.userId },
    data: { notificationPrefs: prefs as object },
  });

  revalidatePath("/settings/notifications");
  return { success: true };
}

// ─── Telegram Link ─────────────────────────────────────────

export async function generateTelegramLinkCode(): Promise<ActionResult<{ code: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const code = await generateLinkCode(auth.user.userId);
  return { success: true, data: { code } };
}

// ─── WhatsApp Link ─────────────────────────────────────────

export async function saveWhatsAppPhone(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const phone = field(formData, "phone");
  if (!phone) return { error: "Número obrigatório" };

  // Normalize: remove spaces, dashes, +
  const normalized = phone.replace(/[\s\-+]/g, "");
  if (!/^\d{9,15}$/.test(normalized)) return { error: "Número inválido" };

  const db = await getTenantDb();
  await db.user.update({
    where: { id: auth.user.userId },
    data: { whatsappPhoneId: normalized },
  });

  revalidatePath("/settings/notifications");
  return { success: true };
}
