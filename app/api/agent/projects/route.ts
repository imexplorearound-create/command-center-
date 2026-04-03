import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateAgent } from "@/lib/agent-auth";

/**
 * GET /api/agent/projects — Agent gets project list
 *
 * Query params:
 *   status — filter by status (default: ativo)
 *   slug   — get a specific project
 */

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
      tasks: {
        select: { id: true, status: true, priority: true },
      },
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

  return NextResponse.json({
    count: projects.length,
    projects: projects.map((p) => {
      const tasksByStatus: Record<string, number> = {};
      for (const t of p.tasks) {
        tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
      }

      return {
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
        tasks: tasksByStatus,
        totalTasks: p.tasks.length,
      };
    }),
  });
}
