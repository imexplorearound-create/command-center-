import { getTenantDb } from "@/lib/tenant";
import type { AuthUser } from "@/lib/auth/dal";

export type VerificationQueueItem = {
  feedbackItemId: string;
  taskId: string;
  taskTitle: string;
  testCaseCode: string | null;
  testCaseTitle: string | null;
  projectSlug: string;
  projectName: string;
  verifyRejectionsCount: number;
  voiceTranscript: string | null;
  pageUrl: string | null;
  pageTitle: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  reproSteps: string[];
  createdAt: string;
};

const FLAG_REJECTIONS_THRESHOLD = 3;

/**
 * Lista FeedbackItems em `ready_for_verification` que o user tem permissão
 * de verificar. Cliente só vê os do seu projecto.
 */
export async function getVerificationQueue(user: AuthUser): Promise<VerificationQueueItem[]> {
  const db = await getTenantDb();

  const projectFilter =
    user.role === "cliente"
      ? { projectId: { in: user.projectIds } }
      : {};

  const items = await db.feedbackItem.findMany({
    where: {
      approvalStatus: "ready_for_verification",
      session: projectFilter,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      taskId: true,
      voiceTranscript: true,
      pageUrl: true,
      pageTitle: true,
      expectedResult: true,
      actualResult: true,
      reproSteps: true,
      verifyRejectionsCount: true,
      createdAt: true,
      task: { select: { title: true } },
      testCase: { select: { code: true, title: true } },
      session: {
        select: {
          project: { select: { slug: true, name: true } },
        },
      },
    },
  });

  type RawItem = (typeof items)[number];
  const withTask = items.filter(
    (i): i is RawItem & { taskId: string } =>
      Boolean(i.taskId && i.session.project),
  );
  const droppedCount = items.length - withTask.length;
  if (droppedCount > 0) {
    console.warn(
      `[verification-queue] dropped ${droppedCount} item(s) without taskId or project — invariant violation (ready_for_verification deve sempre ter task)`,
    );
  }

  return withTask.map((i) => ({
    feedbackItemId: i.id,
    taskId: i.taskId,
    taskTitle: i.task?.title ?? "Task",
    testCaseCode: i.testCase?.code ?? null,
    testCaseTitle: i.testCase?.title ?? null,
    projectSlug: i.session.project.slug,
    projectName: i.session.project.name,
    verifyRejectionsCount: i.verifyRejectionsCount,
    voiceTranscript: i.voiceTranscript,
    pageUrl: i.pageUrl,
    pageTitle: i.pageTitle,
    expectedResult: i.expectedResult,
    actualResult: i.actualResult,
    reproSteps: i.reproSteps,
    createdAt: i.createdAt.toISOString(),
  }));
}

export function isPingPongFlag(verifyRejectionsCount: number): boolean {
  return verifyRejectionsCount >= FLAG_REJECTIONS_THRESHOLD;
}
