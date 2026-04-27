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

export const arquivarTarefaTool: MaestroToolDef = {
  name: "arquivar_tarefa",
  description:
    "Arquiva uma tarefa (soft delete via archivedAt). Bloqueia se a tarefa pertence a um workflow activo. A tarefa pode ser restaurada depois por um admin.",
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

    const fullTask = await db.task.findUnique({
      where: { id: task.id },
      select: {
        archivedAt: true,
        workflowInstanceTasks: {
          where: { instance: { status: "em_curso" } },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (!fullTask) return { ok: false, error: "Tarefa não encontrada." };
    if (fullTask.archivedAt) return { ok: false, error: `Tarefa "${task.title}" já está arquivada.` };
    if (fullTask.workflowInstanceTasks.length > 0) {
      return {
        ok: false,
        error: `Não é possível arquivar "${task.title}": pertence a um workflow activo. Cancela o workflow primeiro.`,
      };
    }

    await db.task.update({
      where: { id: task.id },
      data: { archivedAt: new Date() },
    });
    revalidateTaskPaths(task.projectSlug);

    return {
      ok: true,
      data: { id: task.id, titulo: task.title, gating: gating.type, score: gating.score },
      display: `🗄 ${task.title} arquivada`,
    };
  },
};
