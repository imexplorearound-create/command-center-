import type { NotificationChannel, NotificationPayload } from "../types";

export class WebhookChannel implements NotificationChannel {
  type = "webhook";
  enabled: boolean;
  private url: string;

  constructor() {
    this.url = process.env.NOTIFICATION_WEBHOOK_URL || "";
    this.enabled = !!this.url;
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.enabled) return;
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Webhook ${res.status}`);
  }
}
