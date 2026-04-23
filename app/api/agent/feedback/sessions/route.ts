import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateAgent, resolveAgentTenant } from "@/lib/agent-auth";

export async function GET(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const db = await resolveAgentTenant(request);
  if (db instanceof NextResponse) return db;

  const params = request.nextUrl.searchParams;
  const projectSlug = params.get("project");
  const status = params.get("status") ?? "ready";
  const limit = Math.min(parseInt(params.get("limit") ?? "20"), 100);

  const where: Record<string, unknown> = { status };
  if (projectSlug) where.project = { slug: projectSlug };

  const sessions = await db.feedbackSession.findMany({
    where,
    include: {
      project: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    count: sessions.length,
    sessions: sessions.map((s) => ({
      id: s.id,
      project: s.project.slug,
      projectName: s.project.name,
      testerName: s.testerName,
      status: s.status,
      durationSeconds: s.durationSeconds,
      aiSummary: s.aiSummary,
      itemsCount: s.itemsCount,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
