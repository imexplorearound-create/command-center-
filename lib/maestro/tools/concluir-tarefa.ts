import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import { gateAgentWrite } from "@/lib/maestro/agent-gating";
import { MAESTRO_CHAT_AGENT_ID, MAESTRO_CHAT_CONFIDENCE } from "@/lib/maestro/trust-rules";
import type { MaestroToolDef } from "./types";
import { parseInput, resolveTaskOrError, revalidateTaskPaths } from "./_task-helpers";

const inputSchema = z.object({
  idOrTitle: z.string().min(1),
});

export const concluirTarefaTool: MaestroToolDef = {
  name: "concluir_tarefa",
  description: "Marca uma tarefa como concluída (status=feito, completedAt=agora). Shortcut para mudar_estado_tarefa com status='feito'.",
  inputSchema: {
    type: "object",
    properties: {
      idOrTitle: { type: "string", description: "UUID da tarefa ou parte do título." },
    },
    required: ["idOrTitle"],
  },
  async execute(rawInput) {
    const input = parseInput(inputSchema, rawInput);
    if (!input.ok) return input;

    const db = await getTenantDb();
    const [resolveResult, gating] = await Promise.all([
      resolveTaskOrError(db, input.data.idOrTitle),
      gateAgentWrite({
        agentId: MAESTRO_CHAT_AGENT_ID,
        extractionType: "tarefa",
        confidence: MAESTRO_CHAT_CONFIDENCE,
      }),
    ]);
    if (!resolveResult.ok) return resolveResult;
    const { task } = resolveResult;

    await db.task.update({
      where: { id: task.id },
      data: { status: "feito", completedAt: new Date() },
    });
    revalidateTaskPaths(task.projectSlug);

    return {
      ok: true,
      data: { id: task.id, titulo: task.title, gating: gating.type, score: gating.score },
      display: `✓ ${task.title}`,
    };
  },
};
