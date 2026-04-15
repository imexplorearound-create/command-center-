import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateAgent, resolveAgentTenant } from "@/lib/agent-auth";
import { createFeedbackSessionSchema } from "@/lib/validation/feedback-schema";

export async function POST(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const db = await resolveAgentTenant(request);
  if (db instanceof NextResponse) return db;

  const body = await request.json();
  const parsed = createFeedbackSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const project = await db.project.findFirst({
    where: { slug: data.projectSlug },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json(
      { error: `Projeto "${data.projectSlug}" não encontrado` },
      { status: 404 }
    );
  }

  const durationSeconds = Math.round(
    (new Date(data.endedAt).getTime() - new Date(data.startedAt).getTime()) / 1000
  );

  const session = await db.feedbackSession.create({
    data: {
      tenantId: "",
      projectId: project.id,
      testerName: data.testerName,
      status: "processing",
      startUrl: data.startUrl,
      startedAt: new Date(data.startedAt),
      endedAt: new Date(data.endedAt),
      durationSeconds,
      pagesVisited: data.pagesVisited,
      eventsJson: data.eventsJson ?? undefined,
      itemsCount: data.voiceNotes.length,
    },
  });

  // Create feedback items from voice notes
  if (data.voiceNotes.length > 0) {
    await db.feedbackItem.createMany({
      data: data.voiceNotes.map((note) => ({
        tenantId: "",
        sessionId: session.id,
        type: "voice_note" as const,
        timestampMs: BigInt(note.timestampMs),
        cursorPosition: note.cursorPosition ?? undefined,
        pageUrl: note.pageUrl,
        pageTitle: note.pageTitle,
        voiceTranscript: note.transcript,
        voiceAudioUrl: note.audioUrl,
        status: "pending",
      })),
    });
  }

  return NextResponse.json(
    {
      id: session.id,
      status: session.status,
      itemsCount: data.voiceNotes.length,
    },
    { status: 201 }
  );
}

export async function GET(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const db = await resolveAgentTenant(request);
  if (db instanceof NextResponse) return db;

  const params = request.nextUrl.searchParams;
  const projectSlug = params.get("project");
  const status = params.get("status");
  const tester = params.get("tester");
  const limit = Math.min(parseInt(params.get("limit") ?? "20"), 100);

  const where: Record<string, unknown> = {};
  if (projectSlug) where.project = { slug: projectSlug };
  if (status) where.status = status;
  if (tester) where.testerName = { contains: tester, mode: "insensitive" };

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
      projectName: s.project.name,
      projectSlug: s.project.slug,
      testerName: s.testerName,
      status: s.status,
      startUrl: s.startUrl,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt.toISOString(),
      durationSeconds: s.durationSeconds,
      pagesVisited: s.pagesVisited,
      aiSummary: s.aiSummary,
      itemsCount: s.itemsCount,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
