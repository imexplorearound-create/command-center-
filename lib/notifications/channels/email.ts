import type { NotificationChannel, NotificationPayload } from "../types";
import { markdownToBasicHtml, getSmtpTransporter, SMTP_FROM } from "../smtp";

export class EmailChannel implements NotificationChannel {
  type = "email";
  enabled: boolean;

  constructor() {
    this.enabled = !!process.env.SMTP_HOST;
  }

  async send(payload: NotificationPayload): Promise<void> {
    const transporter = getSmtpTransporter();
    if (!transporter || !payload.recipientEmail) return;

    await transporter.sendMail({
      from: SMTP_FROM,
      to: payload.recipientEmail,
      subject: payload.subject,
      text: payload.body,
      html: markdownToBasicHtml(payload.body),
    });
  }
}
