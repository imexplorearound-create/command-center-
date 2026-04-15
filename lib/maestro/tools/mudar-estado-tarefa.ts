import "server-only";
import { z } from "zod";
import { taskStatusEnum } from "@/lib/validation/task-schema";
import { getTenantDb } from "@/lib/tenant";
import { gateAgentWrite } from "@/lib/maestro/agent-gating";
import { MAESTRO_CHAT_AGENT_ID, MAESTRO_CHAT_CONFIDENCE } from "@/lib/maestro/trust-rules";
import type { MaestroToolDef } from "./types";
import { parseInput, resolveTaskOrError, revalidateTaskPaths } from "./_task-helpers";

const inputSchema = z.object({
  idOrTitle: z.string().min(1),
  status: taskStatusEnum,
});

export const mudarEstadoTarefaTool: MaestroToolDef = {
  name: "mudar_estado_tarefa",
  description:
    "Move uma tarefa entre colunas do kanban: backlog, a_fazer, em_curso, em_revisao, feito. Para 'feito' usa preferencialmente a ferramenta concluir_tarefa (equivalente).",
  inputSchema: {
    type: "object",
    properties: {
      idOrTitle: { type: "string", description: "UUID da tarefa ou parte do título." },
      status: { type: "string", enum: [...taskStatusEnum.options] },
    },
    required: ["idOrTitle", "status"],
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
      data: {
        status: input.data.status,
        completedAt: input.data.status === "feito" ? new Date() : null,
      },
    });
    revalidateTaskPaths(task.projectSlug);

    return {
      ok: true,
      data: { id: task.id, titulo: task.title, estado: input.data.status, gating: gating.type, score: gating.score },
      display: `${task.title} → ${input.data.status}`,
    };
  },
};
