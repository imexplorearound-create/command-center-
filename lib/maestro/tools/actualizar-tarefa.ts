import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { gateAgentWrite } from "@/lib/maestro/agent-gating";
import { MAESTRO_CHAT_AGENT_ID, MAESTRO_CHAT_CONFIDENCE } from "@/lib/maestro/trust-rules";
import type { MaestroToolDef } from "./types";
import { parseInput, resolveTaskOrError, revalidateTaskPaths } from "./_task-helpers";

const inputSchema = z
  .object({
    idOrTitle: z.string().min(1),
    title: z.string().min(1).max(500).optional(),
    description: z.string().optional(),
    priority: z.enum(["baixa", "media", "alta"]).optional(),
    deadline: z.string().optional(),
  })
  .refine((d) => d.title || d.description !== undefined || d.priority || d.deadline !== undefined, {
    message: "Pelo menos um campo para actualizar é obrigatório (title, description, priority ou deadline)",
  });

export const actualizarTarefaTool: MaestroToolDef = {
  name: "actualizar_tarefa",
  description:
    "Actualiza uma tarefa existente (título, descrição, prioridade ou prazo). Identifica a tarefa por UUID ou por título (pesquisa fuzzy — se ambígua, pede ao utilizador para ser mais específico).",
  inputSchema: {
    type: "object",
    properties: {
      idOrTitle: { type: "string", description: "UUID da tarefa ou parte do título." },
      title: { type: "string", description: "Novo título (opcional)." },
      description: { type: "string", description: "Nova descrição (opcional)." },
      priority: { type: "string", enum: ["baixa", "media", "alta"], description: "Nova prioridade (opcional)." },
      deadline: { type: "string", description: "Novo prazo YYYY-MM-DD (opcional). Passa string vazia para limpar." },
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

    const data: Prisma.TaskUpdateInput = {};
    if (input.data.title) data.title = input.data.title;
    if (input.data.description !== undefined) data.description = input.data.description || null;
    if (input.data.priority) data.priority = input.data.priority;
    if (input.data.deadline !== undefined) data.deadline = input.data.deadline ? new Date(input.data.deadline) : null;

    await db.task.update({ where: { id: task.id }, data });
    revalidateTaskPaths(task.projectSlug);

    return {
      ok: true,
      data: { id: task.id, titulo: task.title, alteracoes: Object.keys(data), gating: gating.type, score: gating.score },
      display: `Actualizada: ${task.title} (${Object.keys(data).join(", ")})`,
    };
  },
};
