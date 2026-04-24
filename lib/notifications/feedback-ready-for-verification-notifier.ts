import type { TenantPrisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/feedback-utils";
import { fanOutNotification } from "./send-helpers";
import { buildReadyForVerificationNotification } from "./templates/feedback-ready-for-verification";

/**
 * Dispara quando a Task transita para `ready_for_verification`. Email para
 * `VERIFIER_NOTIFY_TO` (fallback `FEEDBACK_NOTIFY_TO`) + Discord/Telegram
 * se configurados.
 */
export async function notifyReadyForVerification(
  db: TenantPrisma,
  taskId: string,
): Promise<void> {
  const task = await db.task.findFirst({
    where: { id: taskId },
    select: {
      title: true,
      testCase: { select: { code: true, title: true } },
      project: { select: { name: true, slug: true } },
      feedbackItems: {
        where: { approvalStatus: "ready_for_verification" },
        select: { id: true, verifyRejectionsCount: true },
      },
    },
  });
  if (!task || !task.testCase || !task.project) return;

  const count = task.feedbackItems.length;
  if (count === 0) return;

  const maxRejections = Math.max(
    0,
    ...task.feedbackItems.map((f) => f.verifyRejectionsCount),
  );

  const actionUrl = `${getBaseUrl()}/verifications`;
  const { subject, body } = buildReadyForVerificationNotification({
    projectName: task.project.name,
    testCaseCode: task.testCase.code,
    testCaseTitle: task.testCase.title,
    taskTitle: task.title,
    feedbackCount: count,
    verifyRejectionsCount: maxRejections,
    actionUrl,
  });

  await fanOutNotification(
    {
      type: "feedback_ready_for_verification",
      subject,
      summary: subject,
      body,
      actionUrl,
    },
    { primary: "VERIFIER_NOTIFY_TO", fallback: "FEEDBACK_NOTIFY_TO" },
  );
}
