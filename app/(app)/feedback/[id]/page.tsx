import { notFound, redirect } from "next/navigation";
import { getTenantDb } from "@/lib/tenant";
import { getAuthUser } from "@/lib/auth/dal";
import { canReadProject } from "@/lib/auth/roles";
import { parseAcceptanceCriteria } from "@/lib/feedback-utils";
import { NOT_ARCHIVED_FEEDBACK_ITEM } from "@/lib/queries";
import type { ApprovalStatus } from "@/lib/validation/feedback-approval";
import { FeedbackSessionView } from "./session-view";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const db = await getTenantDb();

  const session = await db.feedbackSession.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      items: {
        where: NOT_ARCHIVED_FEEDBACK_ITEM,
        orderBy: { timestampMs: "asc" },
        include: {
          task: {
            select: {
              handoffStatus: true,
              handoffAgentId: true,
              handoffResolvedAt: true,
            },
          },
          testCase: {
            select: {
              id: true,
              code: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!session) notFound();
  if (!canReadProject(user, session.project.id)) redirect("/feedback");

  const items = session.items.map((item) => {
    const acceptanceCriteria = parseAcceptanceCriteria(item.acceptanceCriteria);
    return {
      id: item.id,
      type: item.type,
      classification: item.classification,
      priority: item.priority,
      module: item.module,
      timestampMs: item.timestampMs ? Number(item.timestampMs) : null,
      pageUrl: item.pageUrl,
      pageTitle: item.pageTitle,
      voiceAudioUrl: item.voiceAudioUrl,
      voiceTranscript: item.voiceTranscript,
      contextSnapshot: item.contextSnapshot as Record<string, unknown> | null,
      taskId: item.taskId,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      expectedResult: item.expectedResult,
      actualResult: item.actualResult,
      reproSteps: item.reproSteps,
      acceptanceCriteria,
      screenshotUrl: item.screenshotUrl,
      aiDraftedAt: item.aiDraftedAt ? item.aiDraftedAt.toISOString() : null,
      triagedAt: item.triagedAt ? item.triagedAt.toISOString() : null,
      handoffStatus: item.task?.handoffStatus ?? null,
      handoffAgentId: item.task?.handoffAgentId ?? null,
      handoffResolvedAt: item.task?.handoffResolvedAt?.toISOString() ?? null,
      approvalStatus: item.approvalStatus as ApprovalStatus,
      mentionedTestCaseCodes: item.mentionedTestCaseCodes,
      testCase: item.testCase
        ? { id: item.testCase.id, code: item.testCase.code, title: item.testCase.title }
        : null,
    };
  });

  return (
    <FeedbackSessionView
      session={{
        id: session.id,
        projectName: session.project.name,
        projectSlug: session.project.slug,
        testerName: session.testerName,
        status: session.status,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt.toISOString(),
        durationSeconds: session.durationSeconds,
        pagesVisited: session.pagesVisited,
        itemsCount: session.itemsCount,
        createdAt: session.createdAt.toISOString(),
        archived: session.archivedAt != null,
      }}
      items={items}
    />
  );
}
