import "server-only";
import { readFile } from "fs/promises";
import {
  DRAFT_SYSTEM,
  draftSchema,
  type FeedbackClassification,
  type FeedbackDraft,
} from "./feedback-classify";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const MAX_IMAGE_BYTES = 1_000_000;

interface GeminiDraftInput {
  transcript: string;
  classification: FeedbackClassification;
  events?: unknown[];
  screenshotPaths: string[];
  pageUrl?: string;
  pageTitle?: string;
  projectSlug: string;
}

interface GeminiChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

async function loadImagesAsBase64(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths.slice(0, 5)) {
    try {
      const buf = await readFile(p);
      if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
        console.warn(`[gemini-vision] saltado (${buf.length} bytes): ${p}`);
        continue;
      }
      out.push(buf.toString("base64"));
    } catch (err) {
      console.warn(`[gemini-vision] falha a ler ${p}:`, err instanceof Error ? err.message : err);
    }
  }
  return out;
}

function buildTextPrompt(input: GeminiDraftInput, imageCount: number): string {
  const eventsStr = Array.isArray(input.events) && input.events.length > 0
    ? JSON.stringify(input.events.slice(0, 50))
    : "[]";
  const lines = [
    `Transcrição: "${input.transcript}"`,
    `Tipo (já classificado): ${input.classification.classification} · prioridade inicial: ${input.classification.priority} · módulo: ${input.classification.module}`,
    input.pageUrl && `Página: ${input.pageUrl}`,
    input.pageTitle && `Título: ${input.pageTitle}`,
    `Eventos DOM (${Array.isArray(input.events) ? input.events.length : 0}): ${eventsStr}`,
    `Projecto: ${input.projectSlug}`,
  ].filter(Boolean);
  if (imageCount > 0) {
    lines.push(
      "",
      `As ${imageCount} imagens anexadas são screenshots do ecrã em momentos específicos da gravação. ` +
      `Usa-as para identificar elementos concretos que o tester mencionou (ex: "este botão", "aqui em baixo") ` +
      `e referi-los explicitamente em expectedResult / actualResult.`
    );
  }
  return lines.join("\n");
}

export async function callGeminiDraft(input: GeminiDraftInput): Promise<FeedbackDraft | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!input.transcript) return null;

  const images = await loadImagesAsBase64(input.screenshotPaths);
  if (images.length === 0) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const textPrompt = buildTextPrompt(input, images.length);

  const body = {
    // Gemini 2.5 Flash usa "thinking tokens" internos que contam para max_tokens.
    // Precisa de orçamento generoso para deixar espaço ao JSON final (~3000).
    model,
    max_tokens: 3000,
    messages: [
      { role: "system", content: DRAFT_SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: textPrompt },
          ...images.map((b64) => ({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${b64}` },
          })),
        ],
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[gemini-vision] network error:", err instanceof Error ? err.message : err);
    return null;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(`[gemini-vision] HTTP ${res.status}: ${errText.slice(0, 300)}`);
    return null;
  }

  let parsed: GeminiChatResponse;
  try {
    parsed = (await res.json()) as GeminiChatResponse;
  } catch {
    console.error("[gemini-vision] resposta não é JSON");
    return null;
  }

  const text = parsed.choices?.[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn("[gemini-vision] sem JSON na resposta");
    return null;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch {
    console.warn("[gemini-vision] JSON inválido");
    return null;
  }

  const validated = draftSchema.safeParse(raw);
  if (!validated.success) {
    console.warn("[gemini-vision] schema mismatch:", validated.error.message);
    return null;
  }

  console.log(`[gemini-vision] OK (${images.length} imagens, model=${model})`);
  return validated.data;
}
