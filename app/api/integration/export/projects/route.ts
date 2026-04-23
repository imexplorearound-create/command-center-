import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateIntegration } from "../../auth";

/**
 * GET /api/integration/export/projects
 *
 * Returns all projects with task counts, phase info, and investment map summary.
 * Query params: status, slug
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateIntegration(request);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const slug = searchParams.get("slug");

    const where: Record<string, unknown> = { archivedAt: null };
    if (status) where.status = status;
    if (slug) where.slug = slug;

    const projects = await db.project.findMany({
      where,
      include: {
        _count: { select: { tasks: true } },
        phases: {
          orderBy: { phaseOrder: "asc" },
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
            phaseOrder: true,
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
            status: true,
            lastInteractionAt: true,
            daysSinceContact: true,
          },
        },
        investmentMap: {
          select: {
            totalBudget: true,
            fundingSource: true,
            fundingPercentage: true,
            startDate: true,
            endDate: true,
            rubrics: {
              where: { archivedAt: null },
              select: {
                name: true,
                budgetAllocated: true,
                budgetExecuted: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 200,
    });

    // Get task counts by status
    const taskCounts = await db.task.groupBy({
      by: ["projectId", "status"],
      _count: true,
      where: { projectId: { in: projects.map((p) => p.id) }, archivedAt: null },
    });

    const taskMap = new Map<string, Record<string, number>>();
    for (const row of taskCounts) {
      if (!row.projectId) continue;
      const existing = taskMap.get(row.projectId) ?? {};
      existing[row.status] = row._count;
      taskMap.set(row.projectId, existing);
    }

    const result = projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      type: p.type,
      status: p.status,
      health: p.health,
      progress: p.progress,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      phases: p.phases,
      taskCounts: taskMap.get(p.id) ?? {},
      totalTasks: p._count.tasks,
      client: p.client,
      investmentMap: p.investmentMap,
    }));

    return NextResponse.json({ projects: result });
  } catch (error) {
    console.error("Export projects error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
