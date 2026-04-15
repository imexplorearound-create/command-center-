import "server-only";
import { z } from "zod";
import { resolvePersonByName } from "@/lib/agent-helpers";
import { getTenantDb } from "@/lib/tenant";
import { gateAgentWrite } from "@/lib/maestro/agent-gating";
import { MAESTRO_CHAT_AGENT_ID, MAESTRO_CHAT_CONFIDENCE } from "@/lib/maestro/trust-rules";
import type { MaestroToolDef } from "./types";
import { parseInput, resolveTaskOrError, revalidateTaskPaths } from "./_task-helpers";

const inputSchema = z.object({
  idOrTitle: z.string().min(1),
  assigneeName: z.string().min(1),
});

export const atribuirResponsavelTool: MaestroToolDef = {
  name: "atribuir_responsavel",
  description:
    "Atribui uma tarefa a uma pessoa (nome, email parcial, ou apelido). Se não encontrar, sugere usar listar_pessoas.",
  inputSchema: {
    type: "object",
    properties: {
      idOrTitle: { type: "string", description: "UUID da tarefa ou parte do título." },
      assigneeName: { type: "string", description: "Nome (ou parte) da pessoa. Pode ser email." },
    },
    required: ["idOrTitle", "assigneeName"],
  },
  async execute(rawInput) {
    const input = parseInput(inputSchema, rawInput);
    if (!input.ok) return input;

    const db = await getTenantDb();
    const [resolveResult, assigneeId, gating] = await Promise.all([
      resolveTaskOrError(db, input.data.idOrTitle),
      resolvePersonByName(db, input.data.assigneeName),
      gateAgentWrite({
        agentId: MAESTRO_CHAT_AGENT_ID,
        extractionType: "responsavel",
        confidence: MAESTRO_CHAT_CONFIDENCE,
      }),
    ]);
    if (!resolveResult.ok) return resolveResult;
    const { task } = resolveResult;
    if (!assigneeId) {
      return { ok: false, error: `Pessoa "${input.data.assigneeName}" não encontrada. Usa listar_pessoas.` };
    }

    await db.task.update({ where: { id: task.id }, data: { assigneeId } });
    revalidateTaskPaths(task.projectSlug);

    return {
      ok: true,
      data: { id: task.id, titulo: task.title, assigneeId, gating: gating.type, score: gating.score },
      display: `${task.title} → ${input.data.assigneeName}`,
    };
  },
};
