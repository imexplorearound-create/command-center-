import { notFound } from "next/navigation";
import { getTenantDb } from "@/lib/tenant";
import { requireNonClient } from "@/lib/auth/dal";
import { FeedbackSessionView } from "./session-view";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireNonClient();
  const { id } = await params;
  const db = await getTenantDb();

  const session = await db.feedbackSession.findUnique({
    where: { id },
    include: {
      project: { select: { name: true, slug: true } },
      items: { orderBy: { timestampMs: "asc" } },
    },
  });

  if (!session) notFound();

  const items = session.items.map((item) => ({
    id: item.id,
    type: item.type,
    classification: item.classification,
    priority: item.priority,
    timestampMs: item.timestampMs ? Number(item.timestampMs) : null,
    pageUrl: item.pageUrl,
    pageTitle: item.pageTitle,
    voiceAudioUrl: item.voiceAudioUrl,
    voiceTranscript: item.voiceTranscript,
    contextSnapshot: item.contextSnapshot as Record<string, unknown> | null,
    taskId: item.taskId,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
  }));

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
