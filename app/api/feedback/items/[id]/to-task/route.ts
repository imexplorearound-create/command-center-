import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateAgent, resolveAgentTenant } from "@/lib/agent-auth";
import { convertItemToTaskSchema } from "@/lib/validation/feedback-schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const db = await resolveAgentTenant(request);
  if (db instanceof NextResponse) return db;

  const { id } = await params;

  const item = await db.feedbackItem.findFirst({
    where: { id },
    include: {
      session: { select: { projectId: true, testerName: true } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }

  if (item.taskId) {
    return NextResponse.json(
      { error: "Item já convertido em tarefa", taskId: item.taskId },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = convertItemToTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const overrides = parsed.data;
  const title = overrides.title ?? item.aiSummary ?? item.voiceTranscript?.slice(0, 200) ?? "Feedback item";

  const description = [
    item.voiceTranscript ? `**Transcrição:** ${item.voiceTranscript}` : null,
    item.pageUrl ? `**Página:** ${item.pageUrl}` : null,
    item.module ? `**Módulo:** ${item.module}` : null,
    `**Tester:** ${item.session.testerName}`,
    `**Classificação:** ${item.classification ?? "não classificado"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const [task] = await db.$transaction([
    db.task.create({
      data: {
        tenantId: "",
        title,
        description,
        projectId: item.session.projectId,
        assigneeId: overrides.assigneeId,
        phaseId: overrides.phaseId,
        status: "backlog",
        priority: overrides.priority ?? item.priority ?? "media",
        origin: "feedback",
        originRef: item.id,
        aiExtracted: true,
        aiConfidence: 0.9,
        validationStatus: "por_confirmar",
      },
    }),
    db.feedbackItem.update({
      where: { id },
      data: { status: "converted", reviewedAt: new Date() },
    }),
  ]);

  // Link task to item
  await db.feedbackItem.update({
    where: { id },
    data: { taskId: task.id },
  });

  return NextResponse.json(
    {
      taskId: task.id,
      title: task.title,
      status: task.status,
      itemId: id,
    },
    { status: 201 }
  );
}
