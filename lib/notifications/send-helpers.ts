import { EmailChannel } from "./channels/email";
import { DiscordChannel } from "./channels/discord";
import { TelegramChannel } from "./channels/telegram";
import type { NotificationChannel, NotificationPayload } from "./types";

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

/**
 * Fan-out para canais "broadcast" configurados (Discord webhook, Telegram
 * chat IDs). Não envia email — esse tem recipients por env dedicada, fluxo
 * diferente. Disparar lado-a-lado com sendEmailToAll nos notifiers.
 */
export async function sendToBroadcastChannels(
  payload: NotificationPayload,
): Promise<void> {
  const channels: NotificationChannel[] = [new DiscordChannel(), new TelegramChannel()];
  await Promise.allSettled(
    channels.filter((c) => c.enabled).map((c) => c.send(payload)),
  );
}

/**
 * Notifier one-liner: dispara email (se há recipients + SMTP enabled) E
 * broadcast (Discord/Telegram) em paralelo. `primaryEnv` é a env-var
 * principal (ex. `BRUNO_NOTIFY_TO`); `fallbackEnv` fica para o default.
 */
export async function fanOutNotification(
  payload: NotificationPayload,
  envs: { primary: string; fallback?: string },
): Promise<void> {
  const recipients = resolveEmailRecipients(envs.primary, envs.fallback);
  const emailChannel = getEmailChannelIfEnabled();
  const jobs: Promise<unknown>[] = [sendToBroadcastChannels(payload)];
  if (recipients.length > 0 && emailChannel) {
    jobs.push(sendEmailToAll(emailChannel, recipients, payload));
  }
  await Promise.allSettled(jobs);
}
