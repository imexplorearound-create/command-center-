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
  "priority": "critica" | "alta" | "media" | "baixa",
  "summary": "<resumo de 1-2 frases do que foi reportado>",
  "confidence": <0.0 a 1.0>
}

Critérios de classificação:
- bug: algo não funciona, crash, erro, comportamento inesperado
- suggestion: funciona mas podia ser melhor, UX confusa, lentidão
- question: dúvida do tester, não sabe se é esperado
- praise: elogio, feedback positivo, confirmação de que funciona bem

Prioridade (rubrica — NÃO uses "media" por defeito):
- critica (P0): bloqueia operação crítica, perda de dados, crash sem recuperação, falha de segurança
- alta (P1): afecta receita, conversão ou SLA; workflow principal degradado
- media (P2): fricção notável com workaround; UX pobre em fluxo secundário
- baixa (P3): polish, estética, copy, alinhamento, nice-to-have

Para o módulo, infere a partir do URL da página e do conteúdo da transcrição.
Confidence: quão seguro estás na classificação (0.5 = incerto, 0.9 = muito seguro).`;

const ACTION_PLAN_SYSTEM = `És um engenheiro de software sénior. Recebes a classificação de um bug/sugestão reportado por um tester.

Gera um plano de ação em Markdown (~10-20 linhas) para o developer que vai resolver:

1. **Contexto** — o que foi reportado (1-2 frases)
2. **Ficheiros prováveis** — baseado no módulo e URL (lista 2-3 paths prováveis)
3. **Passos** — 3-5 passos concretos para investigar e resolver
4. **Claude Code** — um comando sugerido para o dev colar no terminal e começar

Sê concreto e prático. Não expliques conceitos — o dev é sénior. Assume que o projecto é um PMS (Property Management System) com Next.js + Prisma + PostgreSQL.`;

import { extractTextBlock as extractText } from "@/lib/maestro/message-utils";

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

// ─── Draft estruturado para triagem ───────────────────────────

export const draftSchema = z.object({
  expectedResult: z.string().max(2000).nullable(),
  actualResult: z.string().max(2000).nullable(),
  reproSteps: z.array(z.string().min(1).max(500)).max(20),
  acceptanceCriteria: z
    .array(z.object({ text: z.string().min(1).max(300), done: z.boolean().default(false) }))
    .max(10),
  suggestedPriority: feedbackPriorityEnum,
});

export type FeedbackDraft = z.infer<typeof draftSchema>;

export const DRAFT_SYSTEM = `És um engenheiro de QA que transforma transcrição de voz + eventos DOM num bug report estruturado.

Responde APENAS com JSON válido (sem markdown, sem texto extra):

{
  "expectedResult": "<o que devia acontecer>",
  "actualResult": "<o que está a acontecer>",
  "reproSteps": ["1. …", "2. …", ...],
  "acceptanceCriteria": [{"text": "…", "done": false}, …],
  "suggestedPriority": "critica" | "alta" | "media" | "baixa"
}

REGRA FUNDAMENTAL — PREENCHE OS CAMPOS SEMPRE QUE PUDERES INFERIR:
- Para BUGS: expected/actual/steps/criteria são obrigatórios (infere-os).
- Para SUGESTÕES: expected = o estado desejado que o tester descreveu; actual = o estado actual observado; steps = como chegar ao sítio onde se vê o problema; criteria = o que prova que a sugestão foi implementada. NÃO DEIXES VAZIOS.
- Para PERGUNTAS: se o tester pergunta sobre comportamento, actual = comportamento observado, expected = null, steps = como reproduzir a situação. Criteria vazia.
- Para ELOGIOS: tudo null/vazio.

Guias:
- reproSteps: deriva dos eventos DOM em ordem cronológica. Linguagem natural ("Abre o calendário", "Clica em Adicionar Reserva"), não selectors CSS. 2-6 passos.
- acceptanceCriteria: 2-4 critérios verificáveis ("X mostra Y", "Z não aparece quando W"). Checklist QA.
- Extrai texto directo da transcrição. Se o tester disse "devia aparecer X", põe "aparece X" em expected. Se disse "está em baixo, devia estar em cima", actual="está em baixo", expected="está em cima".

suggestedPriority — rubrica (NÃO uses sempre "media"):
* critica (P0): bloqueia operação crítica, perda de dados, segurança, crash sem recuperação
* alta (P1): afecta receita/conversão, workflow principal degradado, erro em action importante
* media (P2): fricção notável mas com workaround, UX pobre em fluxo secundário
* baixa (P3): polish, estética, nice-to-have, copy, alinhamento`;

export async function extractFeedbackDraft(input: {
  transcript: string;
  classification: FeedbackClassification;
  events?: unknown[];
  pageUrl?: string;
  pageTitle?: string;
  projectSlug: string;
  screenshotPaths?: string[];
}): Promise<FeedbackDraft | null> {
  if (!input.transcript) return null;

  // Se há screenshots + chave Gemini: usa visão para draft mais concreto.
  // Se Gemini falhar por qualquer motivo, cai no caminho MiniMax (texto) abaixo.
  if (input.screenshotPaths && input.screenshotPaths.length > 0 && process.env.GEMINI_API_KEY) {
    const { callGeminiDraft } = await import("./gemini-vision");
    const viaVision = await callGeminiDraft({
      transcript: input.transcript,
      classification: input.classification,
      events: input.events,
      screenshotPaths: input.screenshotPaths,
      pageUrl: input.pageUrl,
      pageTitle: input.pageTitle,
      projectSlug: input.projectSlug,
    });
    if (viaVision) return viaVision;
  }

  const client = getMaestroClient();

  const eventsStr = Array.isArray(input.events) && input.events.length > 0
    ? JSON.stringify(input.events.slice(0, 50))
    : "[]";

  const userContent = buildPromptLines([
    `Transcrição: "${input.transcript}"`,
    `Tipo (já classificado): ${input.classification.classification} · prioridade inicial: ${input.classification.priority} · módulo: ${input.classification.module}`,
    input.pageUrl && `Página: ${input.pageUrl}`,
    input.pageTitle && `Título: ${input.pageTitle}`,
    `Eventos DOM (${Array.isArray(input.events) ? input.events.length : 0}): ${eventsStr}`,
    `Projecto: ${input.projectSlug}`,
  ]);

  const response = await client.messages.create({
    model: getMaestroModel(),
    max_tokens: 900,
    system: DRAFT_SYSTEM,
    messages: [{ role: "user", content: userContent }],
  });

  const text = extractText(response);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }

  const parsed = draftSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
