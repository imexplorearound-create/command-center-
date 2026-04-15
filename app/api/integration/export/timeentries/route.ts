import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateIntegration } from "../../auth";

/**
 * GET /api/integration/export/timeentries
 *
 * Returns time entries with filters.
 * Query params: dateFrom, dateTo, projectId, personId, status
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateIntegration(request);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const projectId = searchParams.get("projectId");
    const personId = searchParams.get("personId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { archivedAt: null };

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.date = dateFilter;
    }
    if (projectId) where.projectId = projectId;
    if (personId) where.personId = personId;
    if (status) where.status = status;

    const entries = await db.timeEntry.findMany({
      where,
      include: {
        person: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, slug: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { date: "desc" },
      take: 1000,
    });

    const result = entries.map((e) => ({
      id: e.id,
      date: e.date,
      duration: e.duration,
      startTime: e.startTime,
      endTime: e.endTime,
      description: e.description,
      isBillable: e.isBillable,
      status: e.status,
      origin: e.origin,
      createdAt: e.createdAt,
      person: e.person,
      project: e.project,
      task: e.task,
    }));

    return NextResponse.json({ entries: result });
  } catch (error) {
    console.error("Export time entries error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
