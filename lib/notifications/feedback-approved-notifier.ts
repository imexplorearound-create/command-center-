import type { TenantPrisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/feedback-utils";
import { fanOutNotification } from "./send-helpers";
import { buildFeedbackApprovedNotification } from "./templates/feedback-approved";

/**
 * Dispara quando um feedback é aprovado — avisa o developer (Bruno) via
 * email/Discord/Telegram de que há uma task nova para consumir.
 * Email para `BRUNO_NOTIFY_TO` (fallback `FEEDBACK_NOTIFY_TO`).
 */
export async function notifyFeedbackApproved(
  db: TenantPrisma,
  taskId: string,
  approvedByName: string,
): Promise<void> {
  const task = await db.task.findFirst({
    where: { id: taskId },
    select: {
      title: true,
      testCase: { select: { code: true, title: true } },
      project: { select: { name: true, slug: true } },
      feedbackItems: {
        where: { approvalStatus: "approved" },
        select: { id: true },
      },
    },
  });
  if (!task || !task.testCase || !task.project) return;

  const baseUrl = getBaseUrl();
  const taskUrl = `${baseUrl}/project/${task.project.slug}`;
  const devApiUrl = `${baseUrl}/api/dev/tasks/${taskId}`;

  const { subject, body } = buildFeedbackApprovedNotification({
    projectName: task.project.name,
    testCaseCode: task.testCase.code,
    testCaseTitle: task.testCase.title,
    taskTitle: task.title,
    approvedByName,
    taskUrl,
    devApiUrl,
    feedbackCount: task.feedbackItems.length,
  });

  await fanOutNotification(
    {
      type: "feedback_approved",
      subject,
      summary: subject,
      body,
      actionUrl: devApiUrl,
    },
    { primary: "BRUNO_NOTIFY_TO", fallback: "FEEDBACK_NOTIFY_TO" },
  );
}
