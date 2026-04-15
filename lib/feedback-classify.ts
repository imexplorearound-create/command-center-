import "server-only";
import { z } from "zod";
import { getMaestroClient, getMaestroModel } from "@/lib/maestro/client";
import {
  feedbackClassificationEnum,
  feedbackPriorityEnum,
} from "@/lib/validation/feedback-schema";

const classificationSchema = z.object({
  classification: feedbackClassificationEnum,
  module: z.string().max(100),
  priority: feedbackPriorityEnum,
  summary: z.string().max(300),
  confidence: z.number().min(0).max(1),
});

export type FeedbackClassification = z.infer<typeof classificationSchema>;

export function isActionable(c: string): boolean {
  return c === "bug" || c === "suggestion";
}

const CLASSIFY_SYSTEM = `És um classificador de feedback de testes de software. Recebes a transcrição de uma nota de voz de um tester e os eventos DOM capturados durante a gravação.

Analisa e responde APENAS com JSON válido (sem markdown, sem texto extra):

{
  "classification": "bug" | "suggestion" | "question" | "praise",
  "module": "<módulo afectado: checkout, login, reservations, dashboard, etc.>",
  "priority": "alta" | "media" | "baixa",
  "summary": "<resumo de 1-2 frases do que foi reportado>",
  "confidence": <0.0 a 1.0>
}

Critérios de classificação:
- bug: algo não funciona, crash, erro, comportamento inesperado
- suggestion: funciona mas podia ser melhor, UX confusa, lentidão
- question: dúvida do tester, não sabe se é esperado
- praise: elogio, feedback positivo, confirmação de que funciona bem

Prioridade:
- alta: crash, perda de dados, blocker, impossível continuar
- media: UX confusa, lentidão, funcionalidade degradada
- baixa: cosmético, texto, alinhamento, preferência pessoal

Para o módulo, infere a partir do URL da página e do conteúdo da transcrição.
Confidence: quão seguro estás na classificação (0.5 = incerto, 0.9 = muito seguro).`;

const ACTION_PLAN_SYSTEM = `És um engenheiro de software sénior. Recebes a classificação de um bug/sugestão reportado por um tester.

Gera um plano de ação em Markdown (~10-20 linhas) para o developer que vai resolver:

1. **Contexto** — o que foi reportado (1-2 frases)
2. **Ficheiros prováveis** — baseado no módulo e URL (lista 2-3 paths prováveis)
3. **Passos** — 3-5 passos concretos para investigar e resolver
4. **Claude Code** — um comando sugerido para o dev colar no terminal e começar

Sê concreto e prático. Não expliques conceitos — o dev é sénior. Assume que o projecto é um PMS (Property Management System) com Next.js + Prisma + PostgreSQL.`;

function extractText(response: { content: Array<{ type: string; text?: string }> }): string {
  return response.content[0]?.type === "text" ? response.content[0].text ?? "" : "";
}

function buildPromptLines(lines: (string | null | undefined | false)[]): string {
  return lines.filter(Boolean).join("\n");
}

export async function classifyFeedback(input: {
  transcript: string;
  events?: unknown[];
  pageUrl?: string;
  pageTitle?: string;
  projectSlug: string;
}): Promise<FeedbackClassification> {
  const client = getMaestroClient();

  const userContent = buildPromptLines([
    `Transcrição: "${input.transcript}"`,
    input.pageUrl && `Página: ${input.pageUrl}`,
    input.pageTitle && `Título: ${input.pageTitle}`,
    input.events && Array.isArray(input.events) && input.events.length > 0
      && `Eventos DOM (${input.events.length}): ${JSON.stringify(input.events.slice(0, 10))}`,
    `Projecto: ${input.projectSlug}`,
  ]);

  const response = await client.messages.create({
    model: getMaestroModel(),
    max_tokens: 300,
    system: CLASSIFY_SYSTEM,
    messages: [{ role: "user", content: userContent }],
  });

  const text = extractText(response);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return fallbackClassification(input.transcript);

  let raw: unknown;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch {
    return fallbackClassification(input.transcript);
  }

  const parsed = classificationSchema.safeParse(raw);
  return parsed.success ? parsed.data : fallbackClassification(input.transcript);
}

export async function generateActionPlan(input: {
  classification: FeedbackClassification;
  transcript: string;
  pageUrl?: string;
  projectSlug: string;
}): Promise<string> {
  const client = getMaestroClient();

  const userContent = buildPromptLines([
    `Classificação: ${input.classification.classification} (${input.classification.priority})`,
    `Módulo: ${input.classification.module}`,
    `Resumo: ${input.classification.summary}`,
    `Transcrição: "${input.transcript}"`,
    input.pageUrl && `URL: ${input.pageUrl}`,
    `Projecto: ${input.projectSlug}`,
  ]);

  const response = await client.messages.create({
    model: getMaestroModel(),
    max_tokens: 600,
    system: ACTION_PLAN_SYSTEM,
    messages: [{ role: "user", content: userContent }],
  });

  return extractText(response) || "Plano de ação indisponível.";
}

function fallbackClassification(transcript: string): FeedbackClassification {
  return {
    classification: "question",
    module: "desconhecido",
    priority: "media",
    summary: transcript.slice(0, 200),
    confidence: 0.3,
  };
}
