import { z } from "zod";
import { getMaestroClient, getMaestroModel } from "@/lib/maestro/client";
import { extractTextBlock } from "@/lib/maestro/message-utils";

const taskDraftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  acceptanceCriteria: z
    .array(z.object({ text: z.string().min(1).max(300), done: z.boolean().default(false) }))
    .max(10)
    .default([]),
});

export type TaskDraft = z.infer<typeof taskDraftSchema>;

export type FeedbackDraftInput = {
  voiceTranscript: string | null;
  classification: string | null;
  priority: string | null;
  module: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  reproSteps: string[] | null;
  acceptanceCriteria: unknown;
  pageUrl: string | null;
  pageTitle: string | null;
};

export type TaskDrafterInput = {
  testCaseCode: string;
  testCaseTitle: string;
  testCaseExpected: string | null;
  projectSlug: string;
  feedbacks: FeedbackDraftInput[];
};

const SYSTEM = `És um engenheiro de QA que condensa N feedbacks de testers num ticket único para o developer (Bruno).

Responde APENAS com JSON válido:

{
  "title": "<título curto, começa por verbo, refere o TestCase e o problema principal>",
  "description": "<markdown com contexto, passos, comportamento actual vs esperado, referência à URL afectada>",
  "acceptanceCriteria": [{"text": "…", "done": false}, …]
}

Regras:
- Título ≤ 100 caracteres, concreto. Inclui "[T-XXX]" no início.
- Descrição em markdown, até 4000 chars. Usa secções "## Contexto", "## Passos", "## Esperado vs actual".
  Se houver múltiplos feedbacks, agrega mencionando que vieram de sessões distintas.
- Acceptance criteria: 2-6 critérios verificáveis. Não inventes — usa os que vierem nos feedbacks.
- Não uses markdown no título. Não uses códigos (fences).`;

function buildContent(input: TaskDrafterInput): string {
  const parts: string[] = [
    `TestCase: ${input.testCaseCode} — ${input.testCaseTitle}`,
    input.testCaseExpected && `Resultado esperado do teste: ${input.testCaseExpected}`,
    `Projecto: ${input.projectSlug}`,
    `Feedbacks (${input.feedbacks.length}):`,
  ].filter((x): x is string => Boolean(x));

  input.feedbacks.slice(0, 8).forEach((fb, i) => {
    parts.push(`--- Feedback ${i + 1} ---`);
    if (fb.pageUrl) parts.push(`Página: ${fb.pageUrl}`);
    if (fb.voiceTranscript) parts.push(`Transcrição: "${fb.voiceTranscript}"`);
    if (fb.classification) parts.push(`Tipo: ${fb.classification}`);
    if (fb.priority) parts.push(`Prioridade: ${fb.priority}`);
    if (fb.expectedResult) parts.push(`Esperado: ${fb.expectedResult}`);
    if (fb.actualResult) parts.push(`Actual: ${fb.actualResult}`);
    if (fb.reproSteps && fb.reproSteps.length > 0) {
      parts.push(`Passos: ${fb.reproSteps.slice(0, 6).join(" → ")}`);
    }
  });

  return parts.join("\n");
}

/**
 * Desenha title/description/acceptanceCriteria para uma Task a partir de N
 * FeedbackItems do mesmo TestCase. Chamado fire-and-forget após aprovação —
 * se falhar, a Task mantém o título inicial (buildTitle do action).
 */
export async function draftTaskFromFeedbacks(
  input: TaskDrafterInput,
): Promise<TaskDraft | null> {
  if (input.feedbacks.length === 0) return null;

  const client = getMaestroClient();
  const response = await client.messages.create({
    model: getMaestroModel(),
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: "user", content: buildContent(input) }],
  });

  const text = extractTextBlock(response);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }

  const parsed = taskDraftSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
