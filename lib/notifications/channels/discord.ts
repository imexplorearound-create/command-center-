import type { NotificationChannel, NotificationPayload } from "../types";

export class DiscordChannel implements NotificationChannel {
  type = "discord";
  enabled: boolean;
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.DISCORD_NOTIFY_WEBHOOK_URL || "";
    this.enabled = !!this.webhookUrl;
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.enabled) return;
    const res = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `**${payload.subject}**\n${payload.summary}${
          payload.actionUrl ? `\n→ ${payload.actionUrl}` : ""
        }`,
      }),
    });
    if (!res.ok) throw new Error(`Discord webhook ${res.status}`);
  }
}
