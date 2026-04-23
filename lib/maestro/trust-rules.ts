/**
 * Regras puras do trust score do Maestro.
 * Sem side effects — apenas funções deterministas. Side effects vivem
 * em `score-engine.ts` (que escreve na DB).
 *
 * Spec: centro-de-comando-spec-v2.md secção 3 (Maestro AI — Trust Score).
 */

// ─── Categorias de extracção ───────────────────────────────

export const EXTRACTION_TYPES = [
  "tarefa",
  "decisao",
  "resumo",
  "prioridade",
  "responsavel",
  "conteudo",
  "ligacao_codigo",
  "feedback_teste",
] as const;

export type ExtractionType = (typeof EXTRACTION_TYPES)[number];

export const MAESTRO_ENTITY_TYPES = ["task", "interaction", "content"] as const;
export type MaestroEntityType = (typeof MAESTRO_ENTITY_TYPES)[number];

/** Sentinel agentId para o Maestro interno (extracções automáticas a partir de syncs). */
export const MAESTRO_INTERNAL = "maestro-internal";

/**
 * agentId distinto para criações via chat do Maestro. Mantido separado de
 * MAESTRO_INTERNAL para que o trust score do chat (input humano + NLU) evolua
 * independentemente do das extracções automáticas.
 */
export const MAESTRO_CHAT_AGENT_ID = "maestro-chat";

/**
 * Confiança default para criações via chat: o user instruiu directamente,
 * mas o NLU pode interpretar mal — não chega a 1.0.
 */
export const MAESTRO_CHAT_CONFIDENCE = 0.8;

export const EXTRACTION_TYPE_LABELS: Record<ExtractionType, string> = {
  tarefa: "Tarefa",
  decisao: "Decisão",
  resumo: "Resumo",
  prioridade: "Prioridade",
  responsavel: "Responsável",
  conteudo: "Conteúdo",
  ligacao_codigo: "Ligação código-tarefa",
  feedback_teste: "Teste (feedback)",
};

// ─── Acções sensíveis (cap a 50) ──────────────────────────

/**
 * Acções que nunca atingem trust > 50, mesmo que o score real seja maior.
 * Lista hardcoded — quando crescer, mover para config.
 */
export const SENSITIVE_ACTION_KEYS = [
  "financeiro",
  "archive_project",
  "archive_person",
  "comunicacao_externa",
  "auth_change",
] as const;

export type SensitiveAction = (typeof SENSITIVE_ACTION_KEYS)[number];

export const SENSITIVE_CAP = 50;

// ─── Thresholds (5 níveis) ─────────────────────────────────

export const THRESHOLDS = {
  aprendizagem: { min: 0, max: 30 },
  calibracao: { min: 31, max: 50 },
  confianca: { min: 51, max: 70 },
  autonomia: { min: 71, max: 90 },
  pleno: { min: 91, max: 100 },
} as const;

export type ThresholdLevel = keyof typeof THRESHOLDS;

export function thresholdFor(score: number): ThresholdLevel {
  if (score <= 30) return "aprendizagem";
  if (score <= 50) return "calibracao";
  if (score <= 70) return "confianca";
  if (score <= 90) return "autonomia";
  return "pleno";
}

export const THRESHOLD_LABELS: Record<ThresholdLevel, string> = {
  aprendizagem: "Aprendizagem",
  calibracao: "Calibração",
  confianca: "Confiança",
  autonomia: "Autonomia",
  pleno: "Pleno",
};

// ─── Decisão de gating ─────────────────────────────────────

export interface GatingInput {
  /** Score actual do agente para esta categoria. */
  score: number;
  /** Confiança individual da extracção (0-1). */
  confidence?: number;
  /** Acção sensível (financeiro, archive, etc) — força gating até score 50. */
  isSensitive?: boolean;
}

export type GatingDecision = "pending" | "executed";

/**
 * Decide se uma extracção do Maestro entra como pendente (precisa de validação)
 * ou auto-executada.
 *
 * Regras (spec secção 3.3):
 * - 0-30 (aprendizagem): tudo pendente
 * - 31-50 (calibração): pendente, mas confiança individual >85% pode auto
 * - 51-70 (confiança): auto, com notificação
 * - 71-90 (autonomia): auto, sem notificação
 * - 91-100 (pleno): igual a dados factuais
 *
 * Acções sensíveis: cap a 50 — sempre pendente.
 */
export function decideGating(input: GatingInput): GatingDecision {
  const effectiveScore = input.isSensitive
    ? Math.min(input.score, SENSITIVE_CAP)
    : input.score;

  // 0-30: tudo pendente
  if (effectiveScore <= 30) return "pending";

  // 31-50: pendente excepto confiança individual alta
  if (effectiveScore <= 50) {
    if (input.confidence !== undefined && input.confidence > 0.85) return "executed";
    return "pending";
  }

  // 51+: auto
  return "executed";
}

// ─── Deltas de validação ───────────────────────────────────

export type ValidationAction = "confirmar" | "editar" | "rejeitar";

/**
 * Delta a aplicar ao trust score conforme a acção do utilizador (spec 3.6).
 * - Confirma: +2
 * - Edita e confirma: 0
 * - Rejeita: -5
 */
export function applyDelta(action: ValidationAction): number {
  switch (action) {
    case "confirmar":
      return 2;
    case "editar":
      return 0;
    case "rejeitar":
      return -5;
  }
}

/** Aplica o delta a um score, mantendo dentro de 0-100. */
export function clampScore(score: number, delta: number): number {
  return Math.max(0, Math.min(100, score + delta));
}
