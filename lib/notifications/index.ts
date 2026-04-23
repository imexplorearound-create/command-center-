import type { NotificationPayload } from "./types";
import { EmailChannel } from "./channels/email";
import { TelegramChannel } from "./channels/telegram";
import { DiscordChannel } from "./channels/discord";
import { WebhookChannel } from "./channels/webhook";
import { WhatsAppChannel } from "./channels/whatsapp";
import { basePrisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/integrations/telegram-bot";
export type { NotificationPayload } from "./types";

// Global channels (broadcast)
const channels = [
  new EmailChannel(),
  new TelegramChannel(),
  new DiscordChannel(),
  new WebhookChannel(),
  new WhatsAppChannel(),
].filter((ch) => ch.enabled);

/** Broadcast to all globally configured channels. */
export async function notifyStakeholders(
  payload: NotificationPayload
): Promise<void> {
  if (channels.length === 0) return;
  await Promise.allSettled(channels.map((ch) => ch.send(payload)));
}

/** Send notification to a specific user based on their preferences. */
export async function notifyUser(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  const user = await basePrisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      telegramChatId: true,
      whatsappPhoneId: true,
      notificationPrefs: true,
    },
  });
  if (!user) return;

  const prefs = (user.notificationPrefs ?? {}) as {
    channels?: string[];
    types?: Record<string, string[]>;
  };

  // Determine which channels to use for this notification type
  const typeChannels = prefs.types?.[payload.type] ?? prefs.channels ?? ["email"];

  const sends: Promise<void>[] = [];

  if (typeChannels.includes("email") && user.email) {
    const emailCh = channels.find((ch) => ch.type === "email");
    if (emailCh) {
      sends.push(emailCh.send({ ...payload, recipientEmail: user.email }));
    }
  }

  if (typeChannels.includes("telegram") && user.telegramChatId) {
    const text = `${payload.subject}\n\n${payload.summary}${
      payload.actionUrl ? `\n\n→ ${payload.actionUrl}` : ""
    }`;
    sends.push(sendTelegramMessage(user.telegramChatId, text));
  }

  if (typeChannels.includes("whatsapp") && user.whatsappPhoneId) {
    const waCh = channels.find((ch) => ch.type === "whatsapp") as WhatsAppChannel | undefined;
    if (waCh) {
      sends.push(
        waCh.send({ ...payload, metadata: { ...payload.metadata, whatsappTo: user.whatsappPhoneId } })
      );
    }
  }

  await Promise.allSettled(sends);
}
