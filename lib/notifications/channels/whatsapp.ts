import type { NotificationChannel, NotificationPayload } from "../types";

export class WhatsAppChannel implements NotificationChannel {
  type = "whatsapp";
  enabled: boolean;
  private token: string;
  private phoneNumberId: string;

  constructor() {
    this.token = process.env.WHATSAPP_TOKEN || "";
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    this.enabled = !!this.token && !!this.phoneNumberId;
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.enabled || !payload.metadata?.whatsappTo) return;

    const to = payload.metadata.whatsappTo as string;

    // Use template message for outbound (outside 24h window)
    // Falls back to text message if within conversation window
    await this.sendTextMessage(to, `*${payload.subject}*\n\n${payload.summary}`);
  }

  async sendTextMessage(to: string, body: string): Promise<boolean> {
    if (!this.enabled) return false;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body },
        }),
      }
    );

    return res.ok;
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = "pt_PT",
    parameters?: string[]
  ): Promise<boolean> {
    if (!this.enabled) return false;

    const components = parameters
      ? [{ type: "body", parameters: parameters.map((p) => ({ type: "text", text: p })) }]
      : undefined;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            ...(components ? { components } : {}),
          },
        }),
      }
    );

    return res.ok;
  }
}
