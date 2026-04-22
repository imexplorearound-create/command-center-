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
  extractFeedbackDraft,
} from "@/lib/feedback-classify";
import type { FeedbackClassification } from "@/lib/feedback-classify";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { decodeImageDataUrl } from "@/lib/feedback-utils";
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

  const MAX_SHOT_BYTES = 3_000_000;
  const MAX_EXTRA_SHOTS = 10;
  const shotDirAbs = join(process.cwd(), "public", "feedback-screenshots", sessionId);

  const primaryDecoded = decodeImageDataUrl(formData.get("screenshotDataUrl"), MAX_SHOT_BYTES);
  let screenshotUrl: string | null = null;
  let primaryShot: { buffer: Buffer; filepath: string } | null = null;
  if (primaryDecoded) {
    const name = `${itemId}.${primaryDecoded.ext}`;
    primaryShot = { buffer: primaryDecoded.buffer, filepath: join(shotDirAbs, name) };
    screenshotUrl = `/feedback-screenshots/${sessionId}/${name}`;
  }

  const extraShots: Array<{ timestampMs: number; buffer: Buffer; filepath: string; url: string }> = [];
  const extraJsonRaw = formData.get("extraScreenshotsJson");
  if (typeof extraJsonRaw === "string" && extraJsonRaw.length > 0) {
    let parsed: unknown;
    try { parsed = JSON.parse(extraJsonRaw); } catch { /* ignore */ }
    if (Array.isArray(parsed)) {
      for (let i = 0; i < Math.min(parsed.length, MAX_EXTRA_SHOTS); i++) {
        const entry = parsed[i] as { timestampMs?: unknown; dataUrl?: unknown };
        if (typeof entry?.timestampMs !== "number") continue;
        const decoded = decodeImageDataUrl(entry.dataUrl, MAX_SHOT_BYTES);
        if (!decoded) continue;
        const name = `${itemId}-${i}.${decoded.ext}`;
        extraShots.push({
          timestampMs: entry.timestampMs,
          buffer: decoded.buffer,
          filepath: join(shotDirAbs, name),
          url: `/feedback-screenshots/${sessionId}/${name}`,
        });
      }
    }
  }

  await mkdir(dir, { recursive: true });
  if (primaryShot || extraShots.length > 0) {
    await mkdir(shotDirAbs, { recursive: true });
  }

  const [, transcriptResult] = await Promise.all([
    writeFile(filepath, buffer),
    transcribeAudio(buffer, `audio.${ext}`).catch((err) => {
      console.error("Whisper transcription failed:", err instanceof Error ? err.message : err);
      return "";
    }),
    primaryShot
      ? writeFile(primaryShot.filepath, primaryShot.buffer).catch((err) => {
          console.error("Primary screenshot save failed:", err);
          screenshotUrl = null;
        })
      : Promise.resolve(),
    ...extraShots.map((s) =>
      writeFile(s.filepath, s.buffer).catch((err) => {
        console.error("Extra screenshot save failed:", err);
        s.url = "";
      })
    ),
  ]);
  const transcript = transcriptResult;

  if (extraShots.length > 0 && Array.isArray(contextSnapshot)) {
    const urlByTimestamp = new Map<number, string>();
    for (const s of extraShots) {
      if (s.url) urlByTimestamp.set(s.timestampMs, s.url);
    }
    contextSnapshot = (contextSnapshot as Array<Record<string, unknown>>).map((evt) => {
      if (evt && evt.type === "screenshot" && typeof evt.timestampMs === "number") {
        const url = urlByTimestamp.get(evt.timestampMs);
        if (url) return { ...evt, url };
      }
      return evt;
    });
  }

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
        screenshotUrl,
        status: "pending",
      },
    }),
    db.feedbackSession.update({
      where: { id: sessionId },
      data: { itemsCount: { increment: 1 } },
    }),
  ]);

  // Deferido: AI preenche draft estruturado (expected/actual/repro/criteria).
  // Task só é criada quando humano triar e clicar "converter em tarefa".
  if (aiResult && transcript) {
    const publicDir = join(process.cwd(), "public");
    const shotUrls = [
      screenshotUrl,
      ...extraShots.filter((s) => s.url).map((s) => s.url),
    ].filter((u): u is string => !!u);
    const screenshotPaths = shotUrls
      .slice(0, 5)
      .map((u) => join(publicDir, u.replace(/^\//, "")));

    deferDraftExtraction(
      db, aiResult, transcript, itemId,
      Array.isArray(contextSnapshot) ? contextSnapshot : undefined,
      data.pageUrl, data.pageTitle, data.projectSlug,
      screenshotPaths
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
 * Fire-and-forget: chama o extractor AI e guarda o draft estruturado no item.
 * Humano revê e confirma a triagem na UI do Command Center.
 */
function deferDraftExtraction(
  db: TenantPrisma,
  aiResult: FeedbackClassification,
  transcript: string,
  itemId: string,
  events: unknown[] | undefined,
  pageUrl: string | undefined,
  pageTitle: string | undefined,
  projectSlug: string,
  screenshotPaths: string[],
): void {
  (async () => {
    try {
      const draft = await extractFeedbackDraft({
        transcript,
        classification: aiResult,
        events,
        pageUrl,
        pageTitle,
        projectSlug,
        screenshotPaths,
      });
      if (!draft) return;

      await db.feedbackItem.update({
        where: { id: itemId },
        data: {
          expectedResult: draft.expectedResult,
          actualResult: draft.actualResult,
          reproSteps: draft.reproSteps,
          acceptanceCriteria: draft.acceptanceCriteria,
          priority: draft.suggestedPriority,
          aiDraftedAt: new Date(),
        },
      });
    } catch (err) {
      console.error("Draft extraction failed:", err);
    }
  })().catch((err) => console.error("Deferred draft extraction failed:", err));
}
