import nodemailer from "nodemailer";

export const SMTP_FROM = process.env.SMTP_FROM || "Command Center <cc@noreply.local>";

let _transporter: nodemailer.Transporter | null = null;

export function getSmtpTransporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

export function markdownToBasicHtml(md: string): string {
  const codeBlocks: string[] = [];
  let result = md.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(`<pre>${m.slice(3, -3)}</pre>`);
    return `%%CODE_BLOCK_${codeBlocks.length - 1}%%`;
  });

  result = result
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");

  for (let i = 0; i < codeBlocks.length; i++) {
    result = result.replace(`%%CODE_BLOCK_${i}%%`, codeBlocks[i]);
  }
  return result;
}
