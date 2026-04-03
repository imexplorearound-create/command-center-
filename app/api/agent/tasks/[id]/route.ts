import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { authenticateAgent } from "@/lib/agent-auth";
import { resolvePersonByName, toDateStr } from "@/lib/agent-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.priority) data.priority = body.priority;
  if (body.devStatus) data.devStatus = body.devStatus;
  if (body.title) data.title = body.title;
  if (body.status === "feito") data.completedAt = new Date();

  if (body.assignee) {
    const personId = await resolvePersonByName(body.assignee);
    if (personId) data.assigneeId = personId;
  }

  try {
    const updated = await prisma.task.update({
      where: { id },
      data,
      select: { id: true, title: true, status: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { name: true, slug: true } },
      assignee: { select: { name: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    project: task.project?.slug,
    projectName: task.project?.name,
    assignee: task.assignee?.name,
    origin: task.origin,
    devStatus: task.devStatus,
    deadline: toDateStr(task.deadline),
    createdAt: task.createdAt.toISOString(),
  });
}
