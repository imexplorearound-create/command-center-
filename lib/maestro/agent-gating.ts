/**
 * Agent API write gating: dado um agentId e o tipo de extracção, lê o trust
 * score actual e devolve "pending" ou "executed". Não escreve nada.
 *
 * Os endpoints `/api/agent/*` POST chamam isto antes de criar o registo.
 */
import { getTenantDb } from "@/lib/tenant";
import { decideGating, MAESTRO_INTERNAL, type ExtractionType } from "./trust-rules";

interface GateInput {
  agentId: string | undefined;
  extractionType: ExtractionType;
  confidence?: number;
  isSensitive?: boolean;
}

export interface GateResult {
  type: "pending" | "executed";
  agentId: string;
  score: number;
}

export async function gateAgentWrite(input: GateInput): Promise<GateResult> {
  const agentId = input.agentId || MAESTRO_INTERNAL;

  const db = await getTenantDb();
  const score = await db.trustScore.findFirst({
    where: { agentId, extractionType: input.extractionType },
    select: { score: true },
  });

  const currentScore = score?.score ?? 0;

  const type = decideGating({
    score: currentScore,
    confidence: input.confidence,
    isSensitive: input.isSensitive,
  });

  return { type, agentId, score: currentScore };
}
