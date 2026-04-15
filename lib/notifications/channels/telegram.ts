import type { NotificationChannel, NotificationPayload } from "../types";

export class TelegramChannel implements NotificationChannel {
  type = "telegram";
  enabled: boolean;
  private token: string;
  private chatIds: string[];

  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || "";
    this.chatIds = (process.env.TELEGRAM_NOTIFY_CHAT_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    this.enabled = !!this.token && this.chatIds.length > 0;
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.enabled) return;
    const text = `${payload.subject}\n\n${payload.summary}${
      payload.actionUrl ? `\n\n→ ${payload.actionUrl}` : ""
    }`;

    await Promise.allSettled(
      this.chatIds.map((chatId) =>
        fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        })
      )
    );
  }
}
