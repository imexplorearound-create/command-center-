import type { TenantPrisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/feedback-utils";
import { EmailChannel } from "./channels/email";
import {
  buildFeedbackSessionNotification,
} from "./templates/feedback-session";

export async function notifyFeedbackSessionReady(
  db: TenantPrisma,
  sessionId: string
): Promise<void> {
  const recipients = (process.env.FEEDBACK_NOTIFY_TO || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) return;

  const channel = new EmailChannel();
  if (!channel.enabled) return;

  const session = await db.feedbackSession.findUnique({
    where: { id: sessionId },
    include: {
      project: { select: { name: true } },
      items: {
        orderBy: { timestampMs: "asc" },
        select: {
          classification: true,
          priority: true,
          triagedAt: true,
        },
      },
    },
  });
  if (!session) return;

  const baseUrl = getBaseUrl();
  const actionUrl = `${baseUrl}/feedback/${session.id}`;
  const exportUrl = `${baseUrl}/feedback/${session.id}/export.md`;

  const { subject, body } = buildFeedbackSessionNotification({
    projectName: session.project.name,
    testerName: session.testerName,
    items: session.items.map((it) => ({
      classification: it.classification,
      priority: it.priority,
      triaged: !!it.triagedAt,
    })),
    actionUrl,
    exportUrl,
  });

  await Promise.allSettled(
    recipients.map((to) =>
      channel.send({
        type: "feedback_session_ready",
        recipientEmail: to,
        subject,
        summary: subject,
        body,
        actionUrl,
      })
    )
  );
}
