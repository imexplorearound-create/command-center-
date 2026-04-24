import "server-only";
import type { TenantPrisma } from "@/lib/db";
import { draftTaskFromFeedbacks } from "@/lib/feedback/task-drafter";
import { defer } from "@/lib/utils/defer";

/**
 * Pede ao Maestro para redesenhar title/description/AC da Task a partir dos
 * FeedbackItems ligados. Se falhar, Task mantém o título inicial — não é
 * crítico para o fluxo.
 */
export function deferTaskDraft(db: TenantPrisma, taskId: string): void {
  defer("task-drafter", async () => {
    const task = await db.task.findFirst({
      where: { id: taskId },
      select: {
        testCaseId: true,
        project: { select: { slug: true } },
        testCase: { select: { code: true, title: true, expectedResult: true } },
        feedbackItems: {
          where: { approvalStatus: { not: "archived" } },
          orderBy: { createdAt: "asc" },
          take: 8,
          select: {
            voiceTranscript: true,
            classification: true,
            priority: true,
            module: true,
            expectedResult: true,
            actualResult: true,
            reproSteps: true,
            acceptanceCriteria: true,
            pageUrl: true,
            pageTitle: true,
          },
        },
      },
    });
    if (!task || !task.testCase || !task.project) return;

    const draft = await draftTaskFromFeedbacks({
      testCaseCode: task.testCase.code,
      testCaseTitle: task.testCase.title,
      testCaseExpected: task.testCase.expectedResult,
      projectSlug: task.project.slug,
      feedbacks: task.feedbackItems,
    });
    if (!draft) return;

    await db.task.update({
      where: { id: taskId },
      data: {
        title: draft.title,
        description: draft.description,
      },
    });
  });
}
