import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateAgent } from "@/lib/agent-auth";

/**
 * GET /api/agent/tasks — Agent asks for work
 *
 * Query params:
 *   status    — filter by status (backlog, a_fazer, em_curso, etc.)
 *   project   — filter by project slug
 *   assignee  — filter by assignee name (partial match)
 *   origin    — filter by origin (discord, github, manual, etc.)
 *   limit     — max results (default 20)
 *
 * POST /api/agent/tasks — Agent creates a task
 *
 * Body: { title, projectSlug?, assignee?, status?, priority?, origin?, deadline?, aiExtracted? }
 */

export async function GET(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const projectSlug = params.get("project");
  const assigneeName = params.get("assignee");
  const origin = params.get("origin");
  const limit = Math.min(parseInt(params.get("limit") ?? "20"), 100);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (origin) where.origin = origin;
  if (projectSlug) where.project = { slug: projectSlug };
  if (assigneeName) {
    where.assignee = { name: { contains: assigneeName, mode: "insensitive" } };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { name: true, slug: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    count: tasks.length,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      project: t.project?.slug,
      projectName: t.project?.name,
      assignee: t.assignee?.name,
      origin: t.origin,
      deadline: t.deadline?.toISOString().split("T")[0],
      devStatus: t.devStatus,
      aiExtracted: t.aiExtracted,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { title, projectSlug, assignee, status, priority, origin, deadline, aiExtracted } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // Resolve project
  let projectId: string | null = null;
  if (projectSlug) {
    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true },
    });
    projectId = project?.id ?? null;
  }

  // Resolve assignee
  let assigneeId: string | null = null;
  if (assignee) {
    const person = await prisma.person.findFirst({
      where: { name: { contains: assignee, mode: "insensitive" } },
      select: { id: true },
    });
    assigneeId = person?.id ?? null;
  }

  const task = await prisma.task.create({
    data: {
      title,
      projectId,
      assigneeId,
      status: status ?? "backlog",
      priority: priority ?? "media",
      origin: origin ?? `agent:${auth.agentId}`,
      deadline: deadline ? new Date(deadline) : undefined,
      aiExtracted: aiExtracted ?? true,
      aiConfidence: aiExtracted ? 0.8 : undefined,
      validationStatus: aiExtracted ? "por_confirmar" : "confirmed",
    },
  });

  return NextResponse.json({ id: task.id, title: task.title }, { status: 201 });
}
