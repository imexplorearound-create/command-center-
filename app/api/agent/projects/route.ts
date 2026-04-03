import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateAgent } from "@/lib/agent-auth";

export async function GET(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? "ativo";
  const slug = params.get("slug");

  const where: Record<string, unknown> = {};
  if (slug) {
    where.slug = slug;
  } else {
    where.status = status;
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      _count: { select: { tasks: true } },
      phases: {
        where: { status: "em_curso" },
        take: 1,
        select: { name: true },
      },
      client: {
        select: { companyName: true, daysSinceContact: true },
      },
      githubRepos: {
        select: { repoFullName: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Get task counts by status in a single query
  const taskCounts = await prisma.task.groupBy({
    by: ["projectId", "status"],
    _count: true,
    where: { projectId: { in: projects.map((p) => p.id) } },
  });

  const taskMap = new Map<string, Record<string, number>>();
  for (const row of taskCounts) {
    if (!row.projectId) continue;
    const existing = taskMap.get(row.projectId) ?? {};
    existing[row.status] = row._count;
    taskMap.set(row.projectId, existing);
  }

  return NextResponse.json({
    count: projects.length,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      type: p.type,
      status: p.status,
      health: p.health,
      progress: p.progress,
      description: p.description,
      activePhase: p.phases[0]?.name,
      client: p.client?.companyName,
      daysSinceContact: p.client?.daysSinceContact,
      repo: p.githubRepos[0]?.repoFullName,
      tasks: taskMap.get(p.id) ?? {},
      totalTasks: p._count.tasks,
    })),
  });
}
