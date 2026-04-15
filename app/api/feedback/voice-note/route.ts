import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { type TenantPrisma } from "@/lib/db";
import { resolveHeaderTenant } from "@/lib/tenant";
import { authenticateFeedbackOrAgent } from "@/lib/feedback-auth";
import { voiceNoteUploadSchema } from "@/lib/validation/feedback-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import { transcribeAudio } from "@/lib/integrations/groq";
import {
  classifyFeedback,
  generateActionPlan,
  isActionable,
} from "@/lib/feedback-classify";
import type { FeedbackClassification } from "@/lib/feedback-classify";
import { notifyStakeholders } from "@/lib/notifications";
import {
  buildFeedbackEmailBody,
  buildFeedbackTaskDescription,
} from "@/lib/notifications/templates/feedback-bug";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { buildCorsHeaders, isAllowedOrigin } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: "Origin não permitida" }, { status: 403 });
  }
  const corsHeaders = buildCorsHeaders(origin);

  // Rate limit por IP (pré-auth) — evita flood de tentativas
  const ip = getClientIp(request);
  const ipRl = checkRateLimit(`feedback-voice:ip:${ip}`, 60, 60_000);
  if (!ipRl.ok) {
    return NextResponse.json({ error: ipRl.error }, { status: 429, headers: corsHeaders });
  }

  const auth = await authenticateFeedbackOrAgent(request);
  if (auth instanceof NextResponse) return auth;

  // Rate limit por utilizador (pós-auth)
  const userKey = auth.via === "feedback" ? `user:${auth.userId}` : `agent:${auth.agentId}`;
  const userRl = checkRateLimit(`feedback-voice:${userKey}`, 20, 60_000);
  if (!userRl.ok) {
    return NextResponse.json({ error: userRl.error }, { status: 429, headers: corsHeaders });
  }

  const db = await resolveHeaderTenant(auth.tenantId || null);

  const formData = await request.formData();
  const audioFile = formData.get("audio");
  if (!audioFile || !(audioFile instanceof File)) {
    return NextResponse.json(
      { error: "Campo 'audio' obrigatório (ficheiro)" },
      { status: 400, headers: corsHeaders }
    );
  }

  const raw: Record<string, unknown> = {};
  for (const key of [
    "sessionId", "projectSlug", "testerName",
    "pageUrl", "pageTitle", "timestampMs",
    "cursorX", "cursorY",
  ]) {
    const v = formData.get(key);
    if (typeof v === "string" && v.length > 0) raw[key] = v;
  }

  const parsed = voiceNoteUploadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error) },
      { status: 400, headers: corsHeaders }
    );
  }

  const data = parsed.data;

  let contextSnapshot: unknown = undefined;
  const eventsRaw = formData.get("events");
  if (typeof eventsRaw === "string") {
    try { contextSnapshot = JSON.parse(eventsRaw); } catch { /* ignore */ }
  }

  const project = await db.project.findFirst({
    where: { slug: data.projectSlug },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json(
      { error: `Projeto "${data.projectSlug}" não encontrado` },
      { status: 404, headers: corsHeaders }
    );
  }

  // testerName do formData é untrusted; quando há JWT usar o nome do User.
  const testerName =
    (auth.via === "feedback" ? auth.name : data.testerName) || "Tester";

  let sessionId = data.sessionId;
  if (!sessionId) {
    const session = await db.feedbackSession.create({
      data: {
        tenantId: "",
        projectId: project.id,
        testerName,
        status: "processing",
        startedAt: new Date(),
        endedAt: new Date(),
        pagesVisited: data.pageUrl ? [data.pageUrl] : [],
        itemsCount: 0,
      },
    });
    sessionId = session.id;
  }

  const itemId = randomUUID();
  const ext = audioFile.name?.split(".").pop() ?? "webm";
  const filename = `${itemId}.${ext}`;
  const dir = join(process.cwd(), "public", "feedback-audio", sessionId);
  const filepath = join(dir, filename);
  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const audioUrl = `/feedback-audio/${sessionId}/${filename}`;

  // writeFile e transcribeAudio usam o buffer em memória — podem correr em paralelo.
  await mkdir(dir, { recursive: true });
  const [, transcriptResult] = await Promise.all([
    writeFile(filepath, buffer),
    transcribeAudio(buffer, `audio.${ext}`).catch((err) => {
      console.error("Whisper transcription failed:", err instanceof Error ? err.message : err);
      return "";
    }),
  ]);
  const transcript = transcriptResult;

  // Classificação AI no hot path (best-effort, ~1-3s).
  // O actionPlan + task + notify são deferidos para fire-and-forget.
  let aiResult: FeedbackClassification | null = null;
  if (transcript) {
    try {
      aiResult = await classifyFeedback({
        transcript,
        events: Array.isArray(contextSnapshot) ? contextSnapshot : undefined,
        pageUrl: data.pageUrl,
        pageTitle: data.pageTitle,
        projectSlug: data.projectSlug,
      });
    } catch (err) {
      console.error("Feedback classification failed:", err);
    }
  }

  const cursorPosition =
    data.cursorX !== undefined && data.cursorY !== undefined
      ? { x: data.cursorX, y: data.cursorY }
      : undefined;

  await db.$transaction([
    db.feedbackItem.create({
      data: {
        tenantId: "",
        id: itemId,
        sessionId,
        type: "voice_note",
        timestampMs: BigInt(data.timestampMs),
        cursorPosition,
        pageUrl: data.pageUrl,
        pageTitle: data.pageTitle,
        voiceAudioUrl: audioUrl,
        voiceTranscript: transcript || null,
        contextSnapshot: contextSnapshot || undefined,
        classification: aiResult?.classification ?? null,
        module: aiResult?.module ?? null,
        priority: aiResult?.priority ?? null,
        aiSummary: aiResult?.summary ?? null,
        status: "pending",
      },
    }),
    db.feedbackSession.update({
      where: { id: sessionId },
      data: { itemsCount: { increment: 1 } },
    }),
  ]);

  // Deferido: actionPlan + task + notify — não bloqueia a response
  if (aiResult && isActionable(aiResult.classification)) {
    deferTaskAndNotify(
      db, aiResult, transcript, itemId, sessionId, project.id, testerName,
      data.pageUrl, audioUrl, data.projectSlug
    );
  }

  return NextResponse.json(
    {
      sessionId,
      itemId,
      transcript,
      audioUrl,
      classification: aiResult?.classification ?? null,
      module: aiResult?.module ?? null,
      priority: aiResult?.priority ?? null,
      summary: aiResult?.summary ?? null,
    },
    { status: 201, headers: corsHeaders }
  );
}

/**
 * Fire-and-forget: gera action plan, cria Task, notifica stakeholders.
 * Corre fora do request/response cycle para não bloquear o cliente.
 */
function deferTaskAndNotify(
  db: TenantPrisma,
  aiResult: FeedbackClassification,
  transcript: string,
  itemId: string,
  sessionId: string,
  projectId: string,
  testerName: string,
  pageUrl: string | undefined,
  audioUrl: string,
  projectSlug: string,
): void {
  (async () => {
    let actionPlan: string | null = null;
    try {
      actionPlan = await generateActionPlan({
        classification: aiResult,
        transcript,
        pageUrl,
        projectSlug,
      });
    } catch (err) {
      console.error("Action plan generation failed:", err);
    }

    try {
      const task = await db.task.create({
        data: {
          tenantId: "",
          title: aiResult.summary,
          description: buildFeedbackTaskDescription(
            transcript, aiResult, actionPlan, testerName
          ),
          projectId,
          status: "backlog",
          priority: aiResult.priority ?? "media",
          origin: "feedback",
          originRef: itemId,
          aiExtracted: true,
          aiConfidence: aiResult.confidence,
          validationStatus: "por_confirmar",
        },
      });

      await db.feedbackItem.update({
        where: { id: itemId },
        data: { taskId: task.id },
      });
    } catch (err) {
      console.error("Auto-task creation failed:", err);
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3100";
    notifyStakeholders({
      type: aiResult.classification === "bug" ? "feedback_bug" : "feedback_suggestion",
      recipientEmail: process.env.DEV_NOTIFICATION_EMAIL,
      subject: `🎤 ${aiResult.classification === "bug" ? "Bug" : "Sugestão"} (${aiResult.priority}) — ${aiResult.module}`,
      summary: aiResult.summary,
      body: buildFeedbackEmailBody({
        classification: aiResult,
        actionPlan,
        transcript,
        testerName,
        pageUrl,
        audioUrl,
        actionUrl: `${baseUrl}/feedback/${sessionId}`,
      }),
      actionUrl: `${baseUrl}/feedback/${sessionId}`,
    }).catch((err) => console.error("Notification failed:", err));
  })().catch((err) => console.error("Deferred task/notify failed:", err));
}
