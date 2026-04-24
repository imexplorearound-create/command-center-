import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateDev } from "@/lib/dev-api-key";
import { tenantPrisma } from "@/lib/db";
import { signAssetUrlSafe } from "@/lib/handoff-auth";
import { extractExtraScreenshots } from "@/lib/feedback-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const ctx = await authenticateDev(request, {
    scopes: ["tasks:read", "feedback:read"],
  });
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const db = tenantPrisma(ctx.tenantId);

  const task = await db.task.findFirst({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { slug: true, name: true } },
      testCase: {
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          expectedResult: true,
          module: true,
          archivedAt: true,
        },
      },
      feedbackItems: {
        where: { approvalStatus: { not: "archived" } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          approvalStatus: true,
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
          mentionedTestCaseCodes: true,
          rejectionReason: true,
          rejectionOrigin: true,
          verifyRejectionsCount: true,
          createdAt: true,
        },
      },
    },
  });

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const feedbacks = await Promise.all(
    task.feedbackItems.map(async (f) => {
      const extras = extractExtraScreenshots(f.contextSnapshot);
      const [audioUrl, screenshotUrl, extraUrls] = await Promise.all([
        signAssetUrlSafe(f.voiceAudioUrl),
        signAssetUrlSafe(f.screenshotUrl),
        Promise.all(extras.map((e) => signAssetUrlSafe(e.url))),
      ]);
      return {
        id: f.id,
        approvalStatus: f.approvalStatus,
        classification: f.classification,
        priority: f.priority,
        module: f.module,
        pageUrl: f.pageUrl,
        pageTitle: f.pageTitle,
        voiceTranscript: f.voiceTranscript,
        voiceAudioUrl: audioUrl,
        screenshotUrl,
        extraScreenshotUrls: extraUrls.filter((u): u is string => !!u),
        expectedResult: f.expectedResult,
        actualResult: f.actualResult,
        reproSteps: f.reproSteps,
        acceptanceCriteria: f.acceptanceCriteria,
        mentionedTestCaseCodes: f.mentionedTestCaseCodes,
        rejectionReason: f.rejectionReason,
        rejectionOrigin: f.rejectionOrigin,
        verifyRejectionsCount: f.verifyRejectionsCount,
        createdAt: f.createdAt.toISOString(),
      };
    }),
  );

  return NextResponse.json({
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      project: task.project,
      testCase: task.testCase && {
        ...task.testCase,
        archivedAt: task.testCase.archivedAt?.toISOString() ?? null,
      },
      feedbacks,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    },
  });
}
