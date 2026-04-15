import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateAgent, resolveAgentTenant } from "@/lib/agent-auth";
import { resolveProjectSlug, resolvePersonByName, toDateStr } from "@/lib/agent-helpers";
import { gateAgentWrite } from "@/lib/maestro/agent-gating";

export async function GET(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const db = await resolveAgentTenant(request);
  if (db instanceof NextResponse) return db;

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

  const tasks = await db.task.findMany({
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
      deadline: toDateStr(t.deadline),
      devStatus: t.devStatus,
      aiExtracted: t.aiExtracted,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const db = await resolveAgentTenant(request);
  if (db instanceof NextResponse) return db;

  const body = await request.json();
  const { title, projectSlug, assignee, status, priority, origin, deadline, aiExtracted } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const isAi = aiExtracted ?? true;
  const confidence = isAi
    ? typeof body.aiConfidence === "number"
      ? body.aiConfidence
      : 0.8
    : undefined;

  // Resolve project, assignee e gating em paralelo — todas reads independentes.
  // Maestro gating decide se a task entra `por_confirmar` (precisa validação humana)
  // ou já confirmada, baseado no trust score do agente para "tarefa".
  const [resolved, assigneeId, gating] = await Promise.all([
    projectSlug ? resolveProjectSlug(db, projectSlug) : null,
    assignee ? resolvePersonByName(db, assignee) : null,
    isAi
      ? gateAgentWrite({ agentId: auth.agentId, extractionType: "tarefa", confidence })
      : Promise.resolve({ type: "executed" as const, agentId: auth.agentId, score: 100 }),
  ]);

  const task = await db.task.create({
    data: {
      tenantId: "",
      title,
      projectId: resolved?.projectId ?? null,
      assigneeId,
      status: status ?? "backlog",
      priority: priority ?? "media",
      origin: origin ?? `agent:${auth.agentId}`,
      deadline: deadline ? new Date(deadline) : undefined,
      aiExtracted: isAi,
      aiConfidence: confidence,
      validationStatus: gating.type === "pending" ? "por_confirmar" : "confirmado",
    },
  });

  return NextResponse.json(
    {
      type: gating.type,
      id: task.id,
      title: task.title,
      agentId: gating.agentId,
      currentScore: gating.score,
    },
    { status: 201 }
  );
}
