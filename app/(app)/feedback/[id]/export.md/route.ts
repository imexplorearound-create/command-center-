import { NextResponse } from "next/server";
import { requireNonClient } from "@/lib/auth/dal";
import { getTenantDb } from "@/lib/tenant";
import { getBaseUrl, parseAcceptanceCriteria, extractExtraScreenshots } from "@/lib/feedback-utils";
import {
  buildExportFilename,
  buildFeedbackMarkdownExport,
} from "@/lib/notifications/templates/feedback-markdown-export";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireNonClient();
  const { id } = await params;
  const db = await getTenantDb();

  const session = await db.feedbackSession.findFirst({
    where: { id },
    include: {
      project: { select: { name: true, slug: true } },
      items: { orderBy: { timestampMs: "asc" } },
    },
  });
  if (!session) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  }

  const baseUrl = getBaseUrl();

  const markdown = buildFeedbackMarkdownExport({
    projectName: session.project.name,
    projectSlug: session.project.slug,
    testerName: session.testerName,
    startedAt: session.startedAt,
    durationSeconds: session.durationSeconds,
    pagesVisited: session.pagesVisited,
    baseUrl,
    items: session.items.map((it) => ({
      classification: it.classification,
      priority: it.priority,
      module: it.module,
      pageUrl: it.pageUrl,
      pageTitle: it.pageTitle,
      voiceTranscript: it.voiceTranscript,
      voiceAudioUrl: it.voiceAudioUrl,
      screenshotUrl: it.screenshotUrl,
      extraScreenshots: extractExtraScreenshots(it.contextSnapshot),
      expectedResult: it.expectedResult,
      actualResult: it.actualResult,
      reproSteps: it.reproSteps,
      acceptanceCriteria: parseAcceptanceCriteria(it.acceptanceCriteria),
      taskId: it.taskId,
      triagedAt: it.triagedAt,
      aiSummary: it.aiSummary,
    })),
  });

  const filename = buildExportFilename({
    projectSlug: session.project.slug,
    testerName: session.testerName,
    startedAt: session.startedAt,
  });

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
