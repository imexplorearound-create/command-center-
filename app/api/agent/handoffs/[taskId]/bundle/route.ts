import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateAgent, resolveAgentTenant } from "@/lib/agent-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getBaseUrl, parseAcceptanceCriteria, extractExtraScreenshots } from "@/lib/feedback-utils";
import {
  buildFeedbackMarkdownExport,
  buildExportFilename,
} from "@/lib/notifications/templates/feedback-markdown-export";
import { signAssetUrl } from "@/lib/handoff-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const rl = checkRateLimit(`handoff:bundle:${auth.agentId}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  const db = await resolveAgentTenant(request);
  if (db instanceof NextResponse) return db;

  const { taskId } = await params;

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      priority: true,
      handoffStatus: true,
      handoffAgentId: true,
      project: { select: { slug: true } },
      feedbackItems: {
        select: {
          id: true,
          classification: true,
          priority: true,
          module: true,
          pageUrl: true,
          pageTitle: true,
          voiceTranscript: true,
          voiceAudioUrl: true,
          screenshotUrl: true,
          contextSnapshot: true,
          expectedResult: true,
          actualResult: true,
          reproSteps: true,
          acceptanceCriteria: true,
          taskId: true,
          triagedAt: true,
          aiSummary: true,
          session: {
            select: {
              id: true,
              testerName: true,
              startedAt: true,
              durationSeconds: true,
              pagesVisited: true,
              project: { select: { name: true, slug: true } },
            },
          },
        },
        // Bundle histórico: um Task pode ter N FeedbackItems após F3 (B1 decision).
        // Para manter compat com consumidores existentes, exportamos o primeiro.
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }
  if (task.feedbackItems.length === 0) {
    return NextResponse.json({ error: "task has no linked feedback item" }, { status: 404 });
  }

  const item = task.feedbackItems[0]!;
  const session = item.session;

  const extras = extractExtraScreenshots(item.contextSnapshot);
  const assetPaths = Array.from(
    new Set(
      [item.screenshotUrl, item.voiceAudioUrl, ...extras.map((e) => e.url)].filter(
        (p): p is string => !!p
      )
    )
  );
  const signedEntries = await Promise.all(
    assetPaths.map(async (p) => [p, await signAssetUrl(p)] as const)
  );
  const signedMap = new Map(signedEntries);

  const markdown = buildFeedbackMarkdownExport({
    projectName: session.project.name,
    projectSlug: session.project.slug,
    testerName: session.testerName,
    startedAt: session.startedAt,
    durationSeconds: session.durationSeconds,
    pagesVisited: session.pagesVisited,
    baseUrl: getBaseUrl(),
    signAsset: (path) => signedMap.get(path) ?? `${getBaseUrl()}${path}`,
    items: [
      {
        classification: item.classification,
        priority: item.priority,
        module: item.module,
        pageUrl: item.pageUrl,
        pageTitle: item.pageTitle,
        voiceTranscript: item.voiceTranscript,
        voiceAudioUrl: item.voiceAudioUrl,
        screenshotUrl: item.screenshotUrl,
        extraScreenshots: extras,
        expectedResult: item.expectedResult,
        actualResult: item.actualResult,
        reproSteps: item.reproSteps,
        acceptanceCriteria: parseAcceptanceCriteria(item.acceptanceCriteria),
        taskId: item.taskId,
        triagedAt: item.triagedAt,
        aiSummary: item.aiSummary,
      },
    ],
  });

  const filename = buildExportFilename({
    projectSlug: session.project.slug,
    testerName: session.testerName,
    startedAt: session.startedAt,
  });

  const assets = [
    item.screenshotUrl && {
      type: "screenshot" as const,
      path: item.screenshotUrl,
      url: signedMap.get(item.screenshotUrl)!,
    },
    ...extras.map((e) => ({
      type: "screenshot" as const,
      path: e.url,
      url: signedMap.get(e.url)!,
      timestampMs: e.timestampMs,
    })),
    item.voiceAudioUrl && {
      type: "audio" as const,
      path: item.voiceAudioUrl,
      url: signedMap.get(item.voiceAudioUrl)!,
    },
  ].filter(Boolean);

  return NextResponse.json({
    task: {
      id: task.id,
      title: task.title,
      priority: task.priority,
      handoffStatus: task.handoffStatus,
      handoffAgentId: task.handoffAgentId,
      projectSlug: task.project?.slug ?? null,
    },
    feedback: {
      sessionId: session.id,
      itemId: item.id,
    },
    markdown,
    filename,
    assets,
  });
}
