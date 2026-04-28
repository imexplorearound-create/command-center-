import "server-only";
import { basePrisma, type Tx } from "@/lib/db";
import { recordDecay } from "@/lib/maestro/score-engine";
import { DECAY_COOLDOWN_DAYS } from "@/lib/maestro/trust-rules";

const DAY_MS = 24 * 60 * 60 * 1000;
const RUN_CONCURRENCY = 6;

export interface DecayCandidate {
  id: string;
  tenantId: string;
  agentId: string;
  extractionType: string;
  score: number;
  lastInteractionAt: Date | null;
}

export interface DecayRunInput {
  tenantId?: string;
  dryRun?: boolean;
  cooldownDays?: number;
  /** Override do "agora" — só para testes determinísticos. */
  now?: Date;
}

export interface DecayRunResult {
  processed: number;
  decayed: number;
  /** Score chegou a 0 entre o select e o write (race condition). */
  skippedZero: number;
  /** Populated apenas em dryRun. */
  candidates?: DecayCandidate[];
  errors: { trustScoreId: string; error: string }[];
}

/**
 * Aplica decay (-1) a TrustScores inactivos:
 *  1. Selecciona rows com lastInteractionAt < now - cooldownDays AND score > 0
 *  2. Para cada um, dentro de transaction: recordDecay (update + audit log)
 *  3. Bounded concurrency (6 workers)
 *
 * `dryRun: true` devolve a lista de candidatos sem persistir nada.
 *
 * Pure (sem auth, sem session). Caller é responsável por gating
 * (`authenticateDecayCron`).
 */
export async function runDecay(input: DecayRunInput = {}): Promise<DecayRunResult> {
  const now = input.now ?? new Date();
  const cooldownDays = input.cooldownDays ?? DECAY_COOLDOWN_DAYS;
  const cutoff = new Date(now.getTime() - cooldownDays * DAY_MS);

  const where: {
    lastInteractionAt: { not: null; lt: Date };
    score: { gt: number };
    tenantId?: string;
  } = {
    lastInteractionAt: { not: null, lt: cutoff },
    score: { gt: 0 },
  };
  if (input.tenantId) where.tenantId = input.tenantId;

  const candidates = await basePrisma.trustScore.findMany({
    where,
    select: {
      id: true,
      tenantId: true,
      agentId: true,
      extractionType: true,
      score: true,
      lastInteractionAt: true,
    },
  });

  if (input.dryRun) {
    return {
      processed: candidates.length,
      decayed: 0,
      skippedZero: 0,
      candidates,
      errors: [],
    };
  }

  let decayed = 0;
  let skippedZero = 0;
  const errors: { trustScoreId: string; error: string }[] = [];

  let cursor = 0;
  async function worker() {
    while (cursor < candidates.length) {
      const ts = candidates[cursor++];
      try {
        if (ts.score <= 0) {
          skippedZero += 1;
          continue;
        }
        await basePrisma.$transaction(async (tx: Tx) => {
          await recordDecay(
            {
              trustScoreId: ts.id,
              tenantId: ts.tenantId,
              agentId: ts.agentId,
              extractionType: ts.extractionType,
              scoreBefore: ts.score,
            },
            tx,
          );
        });
        decayed += 1;
      } catch (err) {
        errors.push({
          trustScoreId: ts.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(RUN_CONCURRENCY, candidates.length) }, worker),
  );

  return { processed: candidates.length, decayed, skippedZero, errors };
}
