import { EmailChannel } from "./channels/email";
import type { NotificationPayload } from "./types";

/**
 * Parses comma-separated recipient list from env. Primary env wins; if vazia,
 * tenta fallback. Devolve [] se ambas vazias (caller skip early).
 */
export function resolveEmailRecipients(
  primaryEnv: string,
  fallbackEnv?: string,
): string[] {
  const raw = process.env[primaryEnv] || (fallbackEnv ? process.env[fallbackEnv] : "") || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Devolve EmailChannel apenas se estiver configurado. null se SMTP disabled.
 */
export function getEmailChannelIfEnabled(): EmailChannel | null {
  const channel = new EmailChannel();
  return channel.enabled ? channel : null;
}

/**
 * Envia o mesmo payload a N recipients em paralelo. Usa allSettled — qualquer
 * falha num recipient é logged (best-effort, não bloqueia os restantes).
 */
export async function sendEmailToAll(
  channel: EmailChannel,
  recipients: string[],
  payload: Omit<NotificationPayload, "recipientEmail">,
): Promise<void> {
  await Promise.allSettled(
    recipients.map((to) => channel.send({ ...payload, recipientEmail: to })),
  );
}
