import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant";
import { gateAgentWrite } from "@/lib/maestro/agent-gating";
import { MAESTRO_CHAT_AGENT_ID, MAESTRO_CHAT_CONFIDENCE } from "@/lib/maestro/trust-rules";
import type { MaestroToolDef } from "./types";
import { parseInput } from "./_task-helpers";

const inputSchema = z.object({
  decisionId: z.string().uuid(),
  resolutionNote: z.string().max(1000).optional(),
});

export const resolverDecisaoTool: MaestroToolDef = {
  name: "resolver_decisao",
  description:
    "Marca uma Decision como resolvida (resolvedAt=agora, resolutionSource='human'). Aceita nota opcional. Não reverte — para reabrir, usa o ecrã de Decisions.",
  inputSchema: {
    type: "object",
    properties: {
      decisionId: { type: "string", description: "UUID da Decision." },
      resolutionNote: {
        type: "string",
        description: "Nota explicativa da resolução (opcional, max 1000 chars).",
      },
    },
    required: ["decisionId"],
  },
  async execute(rawInput, ctx) {
    const input = parseInput(inputSchema, rawInput);
    if (!input.ok) return input;

    const db = await getTenantDb();
    const [existing, gating] = await Promise.all([
      db.decision.findUnique({
        where: { id: input.data.decisionId },
        select: { id: true, title: true, resolvedAt: true },
      }),
      gateAgentWrite({
        agentId: MAESTRO_CHAT_AGENT_ID,
        extractionType: "decisao",
        confidence: MAESTRO_CHAT_CONFIDENCE,
      }),
    ]);
    if (!existing) return { ok: false, error: "Decision não encontrada." };
    if (existing.resolvedAt) {
      return { ok: false, error: `Decision "${existing.title}" já está resolvida.` };
    }

    await db.decision.update({
      where: { id: existing.id },
      data: {
        resolvedAt: new Date(),
        resolvedById: ctx.personId,
        resolutionNote: input.data.resolutionNote ?? null,
        resolutionSource: "human",
      },
    });
    revalidatePath("/");

    return {
      ok: true,
      data: {
        id: existing.id,
        titulo: existing.title,
        gating: gating.type,
        score: gating.score,
      },
      display: `✓ Decision "${existing.title}" resolvida`,
    };
  },
};
