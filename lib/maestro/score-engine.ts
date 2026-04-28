/**
 * Side effects do trust score: lê/escreve na DB, escreve `MaestroAction` log.
 * Pure logic vive em `trust-rules.ts`.
 */
import { type Tx } from "@/lib/db";
import { getTenantDb, getTenantId } from "@/lib/tenant";
import {
  applyDelta,
  clampScore,
  DECAY_ACTION,
  DECAY_DELTA,
  DECAY_ENTITY_TYPE,
  MAESTRO_INTERNAL,
  type ValidationAction,
  type ExtractionType,
  type MaestroEntityType,
} from "./trust-rules";

// Re-export for backwards compat (Sprint 4 callers may import from here).
export { MAESTRO_INTERNAL } from "./trust-rules";

interface RecordValidationInput {
  agentId?: string;
  extractionType: ExtractionType;
  action: ValidationAction;
  entityType: MaestroEntityType;
  entityId: string;
  performedById: string | null;
}

export interface RecordValidationResult {
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
}

/**
 * Atomicamente:
 *  1. lê (ou cria) o trust score (agentId, extractionType)
 *  2. aplica o delta
 *  3. incrementa contadores
 *  4. escreve uma linha em MaestroAction
 *
 * Aceita um `tx` opcional para o caller poder agrupar isto com outras escritas
 * (ex: `validation.ts` agrupa o `task.update` e o `recordValidation` na mesma
 * transaction). Sem `tx`, abre a sua própria.
 */
export async function recordValidation(
  input: RecordValidationInput,
  tx?: Tx
): Promise<RecordValidationResult> {
  const run = (client: Tx) => recordValidationInTx(input, client);
  if (tx) return run(tx);
  const db = await getTenantDb();
  // Cast: TenantPrisma.$transaction callback receives a compatible client,
  // but the extended type signature differs from base Tx.
  return db.$transaction(run as Parameters<typeof db.$transaction>[0]) as Promise<RecordValidationResult>;
}

async function recordValidationInTx(
  input: RecordValidationInput,
  tx: Tx
): Promise<RecordValidationResult> {
  const agentId = input.agentId ?? MAESTRO_INTERNAL;
  const delta = applyDelta(input.action);
  const tenantId = await getTenantId();
  const whereKey = {
    tenantId_agentId_extractionType: { tenantId, agentId, extractionType: input.extractionType },
  };

  const existing = await tx.trustScore.findUnique({
    where: whereKey,
    select: { score: true },
  });

  const scoreBefore = existing?.score ?? 0;
  const scoreAfter = clampScore(scoreBefore, delta);

  await tx.trustScore.upsert({
    where: whereKey,
    create: {
      tenantId,
      agentId,
      extractionType: input.extractionType,
      score: scoreAfter,
      totalConfirmations: input.action === "confirmar" ? 1 : 0,
      totalEdits: input.action === "editar" ? 1 : 0,
      totalRejections: input.action === "rejeitar" ? 1 : 0,
      lastInteractionAt: new Date(),
    },
    update: {
      score: scoreAfter,
      totalConfirmations: input.action === "confirmar" ? { increment: 1 } : undefined,
      totalEdits: input.action === "editar" ? { increment: 1 } : undefined,
      totalRejections: input.action === "rejeitar" ? { increment: 1 } : undefined,
      lastInteractionAt: new Date(),
    },
  });

  await tx.maestroAction.create({
    data: {
      tenantId,
      agentId,
      extractionType: input.extractionType,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      scoreDelta: delta,
      scoreBefore,
      scoreAfter,
      performedById: input.performedById,
    },
  });

  return { scoreBefore, scoreAfter, delta };
}

// ─── Decay (Sprint 6a) ─────────────────────────────────────

interface RecordDecayInput {
  trustScoreId: string;
  tenantId: string;
  agentId: string;
  extractionType: string;
  scoreBefore: number;
}

export interface RecordDecayResult {
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
}

/**
 * Aplica decay (-1) ao trust score:
 *  1. Update TrustScore.score (clamp 0). **Não** mexe em lastInteractionAt
 *     nem nos contadores — preserva o critério "última interacção humana".
 *  2. Cria MaestroAction { action: "decay", entityType: "trust_score",
 *     entityId: trustScoreId, performedById: null } como audit sistémico.
 *
 * Operação atómica via tx (obrigatório). Caller (runner) é responsável pelo
 * critério de selecção (lastInteractionAt + cooldown + score > 0).
 *
 * Usa o cliente raw (basePrisma.Tx), não o tenantPrisma extended, porque
 * corre fora de session (cron) e processa múltiplos tenants.
 */
export async function recordDecay(
  input: RecordDecayInput,
  tx: Tx,
): Promise<RecordDecayResult> {
  const scoreAfter = clampScore(input.scoreBefore, DECAY_DELTA);

  await tx.trustScore.update({
    where: { id: input.trustScoreId },
    data: { score: scoreAfter },
  });

  await tx.maestroAction.create({
    data: {
      tenantId: input.tenantId,
      agentId: input.agentId,
      extractionType: input.extractionType,
      action: DECAY_ACTION,
      entityType: DECAY_ENTITY_TYPE,
      entityId: input.trustScoreId,
      scoreDelta: DECAY_DELTA,
      scoreBefore: input.scoreBefore,
      scoreAfter,
      performedById: null,
    },
  });

  return { scoreBefore: input.scoreBefore, scoreAfter, delta: DECAY_DELTA };
}
