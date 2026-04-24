import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateAgent, resolveAgentTenant } from "@/lib/agent-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getBaseUrl } from "@/lib/feedback-utils";
import { HANDOFF_STATUS, HANDOFF_STATUS_VALUES } from "@/lib/handoff-status";

export async function GET(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const rl = checkRateLimit(`handoff:list:${auth.agentId}`, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  const db = await resolveAgentTenant(request);
  if (db instanceof NextResponse) return db;

  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? HANDOFF_STATUS.QUEUED;
  if (!HANDOFF_STATUS_VALUES.has(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const agentFilter = params.get("agentId") ?? auth.agentId;
  const limit = Math.min(parseInt(params.get("limit") ?? "50"), 200);

  const tasks = await db.task.findMany({
    where: {
      handoffStatus: status,
      handoffAgentId: agentFilter === "unknown" ? undefined : agentFilter,
      archivedAt: null,
    },
    select: {
      id: true,
      title: true,
      priority: true,
      handoffStatus: true,
      handoffSentAt: true,
      project: { select: { slug: true } },
      feedbackItems: {
        select: { id: true, sessionId: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
    orderBy: { handoffSentAt: "asc" },
    take: limit,
  });

  const baseUrl = getBaseUrl();

  return NextResponse.json({
    count: tasks.length,
    handoffs: tasks.map((t) => ({
      taskId: t.id,
      title: t.title,
      priority: t.priority,
      status: t.handoffStatus,
      projectSlug: t.project?.slug ?? null,
      feedbackItemId: t.feedbackItems[0]?.id ?? null,
      feedbackSessionId: t.feedbackItems[0]?.sessionId ?? null,
      sentAt: t.handoffSentAt?.toISOString() ?? null,
      bundleUrl: `${baseUrl}/api/agent/handoffs/${t.id}/bundle`,
    })),
  });
}
