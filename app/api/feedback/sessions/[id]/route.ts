import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveHeaderTenant } from "@/lib/tenant";
import { authenticateFeedbackOrAgent } from "@/lib/feedback-auth";
import { updateFeedbackSessionSchema } from "@/lib/validation/feedback-schema";
import { firstZodError } from "@/lib/validation/project-schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateFeedbackOrAgent(request);
  if (auth instanceof NextResponse) return auth;

  const db = await resolveHeaderTenant(auth.tenantId || null);

  const { id } = await params;

  const session = await db.feedbackSession.findFirst({
    where: { id },
    include: {
      project: { select: { name: true, slug: true } },
      items: {
        orderBy: { timestampMs: "asc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    projectName: session.project.name,
    projectSlug: session.project.slug,
    testerName: session.testerName,
    status: session.status,
    startUrl: session.startUrl,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt.toISOString(),
    durationSeconds: session.durationSeconds,
    pagesVisited: session.pagesVisited,
    aiSummary: session.aiSummary,
    aiClassification: session.aiClassification,
    itemsCount: session.itemsCount,
    createdAt: session.createdAt.toISOString(),
    items: session.items.map((item) => ({
      id: item.id,
      type: item.type,
      classification: item.classification,
      module: item.module,
      priority: item.priority,
      timestampMs: item.timestampMs ? Number(item.timestampMs) : null,
      cursorPosition: item.cursorPosition,
      pageUrl: item.pageUrl,
      pageTitle: item.pageTitle,
      voiceAudioUrl: item.voiceAudioUrl,
      voiceTranscript: item.voiceTranscript,
      aiSummary: item.aiSummary,
      taskId: item.taskId,
      status: item.status,
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateFeedbackOrAgent(request);
  if (auth instanceof NextResponse) return auth;

  const db = await resolveHeaderTenant(auth.tenantId || null);

  const { id } = await params;
  const body = await request.json();
  const parsed = updateFeedbackSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error) },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status) updateData.status = parsed.data.status;
  if (parsed.data.endedAt) updateData.endedAt = new Date(parsed.data.endedAt);
  if (parsed.data.pagesVisited) updateData.pagesVisited = parsed.data.pagesVisited;

  if (parsed.data.endedAt) {
    const existing = await db.feedbackSession.findFirst({
      where: { id },
      select: { startedAt: true },
    });
    if (existing) {
      updateData.durationSeconds = Math.round(
        (new Date(parsed.data.endedAt).getTime() - existing.startedAt.getTime()) / 1000
      );
    }
  }

  const session = await db.feedbackSession.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ id: session.id, status: session.status });
}
