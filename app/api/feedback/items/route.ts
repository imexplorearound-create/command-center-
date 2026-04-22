import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateAgent, resolveAgentTenant } from "@/lib/agent-auth";
import { NOT_ARCHIVED_FEEDBACK_ITEM } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const db = await resolveAgentTenant(request);
  if (db instanceof NextResponse) return db;

  const params = request.nextUrl.searchParams;
  const sessionId = params.get("session");
  const classification = params.get("classification");
  const module = params.get("module");
  const status = params.get("status");
  const limit = Math.min(parseInt(params.get("limit") ?? "50"), 200);

  const where: Record<string, unknown> = { ...NOT_ARCHIVED_FEEDBACK_ITEM };
  if (sessionId) where.sessionId = sessionId;
  if (classification) where.classification = classification;
  if (module) where.module = { contains: module, mode: "insensitive" };
  if (status) where.status = status;

  const items = await db.feedbackItem.findMany({
    where,
    include: {
      session: {
        select: {
          testerName: true,
          project: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    count: items.length,
    items: items.map((item) => ({
      id: item.id,
      sessionId: item.sessionId,
      type: item.type,
      classification: item.classification,
      module: item.module,
      priority: item.priority,
      timestampMs: item.timestampMs ? Number(item.timestampMs) : null,
      pageUrl: item.pageUrl,
      pageTitle: item.pageTitle,
      voiceTranscript: item.voiceTranscript,
      aiSummary: item.aiSummary,
      taskId: item.taskId,
      status: item.status,
      testerName: item.session.testerName,
      projectName: item.session.project.name,
      projectSlug: item.session.project.slug,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}
