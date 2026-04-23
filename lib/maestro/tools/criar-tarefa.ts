import "server-only";
import { z } from "zod";
import { resolveProjectSlug, resolvePersonByName } from "@/lib/agent-helpers";
import { getTenantDb } from "@/lib/tenant";
import { gateAgentWrite } from "@/lib/maestro/agent-gating";
import { MAESTRO_CHAT_AGENT_ID, MAESTRO_CHAT_CONFIDENCE } from "@/lib/maestro/trust-rules";
import { createTaskCore } from "@/lib/actions/task-create-core";
import type { MaestroToolDef } from "./types";

export { MAESTRO_CHAT_AGENT_ID } from "@/lib/maestro/trust-rules";

const inputSchema = z.object({
  title: z.string().min(1).max(500),
  projectSlug: z.string().optional(),
  assigneeName: z.string().optional(),
  priority: z.enum(["baixa", "media", "alta"]).optional(),
  deadline: z.string().optional(), // YYYY-MM-DD
  description: z.string().optional(),
});

export const criarTarefaTool: MaestroToolDef = {
  name: "criar_tarefa",
  description:
    "Cria uma nova tarefa no Centro de Comando. Passa pelo trust score do Maestro: se o score for baixo, a tarefa entra como 'por confirmar' (precisa validação humana); se for alto, entra confirmada. Devolve sempre o estado em que ficou.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Título da tarefa (1-500 caracteres). Obrigatório.",
      },
      projectSlug: {
        type: "string",
        description: "Slug do projecto. Opcional — se omitir, fica sem projecto.",
      },
      assigneeName: {
        type: "string",
        description: "Nome (ou parte) do responsável. Opcional.",
      },
      priority: {
        type: "string",
        enum: ["baixa", "media", "alta"],
        description: "Prioridade (default 'media').",
      },
      deadline: {
        type: "string",
        description: "Prazo no formato YYYY-MM-DD. Opcional.",
      },
      description: {
        type: "string",
        description: "Descrição livre. Opcional.",
      },
    },
    required: ["title"],
  },
  async execute(rawInput, ctx) {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        error: `Input inválido: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }
    const input = parsed.data;

    const db = await getTenantDb();
    const [resolved, assigneeId, gating] = await Promise.all([
      input.projectSlug ? resolveProjectSlug(db, input.projectSlug) : null,
      input.assigneeName ? resolvePersonByName(db, input.assigneeName) : null,
      gateAgentWrite({
        agentId: MAESTRO_CHAT_AGENT_ID,
        extractionType: "tarefa",
        confidence: MAESTRO_CHAT_CONFIDENCE,
      }),
    ]);

    if (input.projectSlug && !resolved) {
      return {
        ok: false,
        error: `Projecto '${input.projectSlug}' não encontrado. Usa listar_projectos para ver os disponíveis.`,
      };
    }

    if (input.assigneeName && !assigneeId) {
      return {
        ok: false,
        error: `Pessoa '${input.assigneeName}' não encontrada. Usa listar_pessoas para ver as disponíveis.`,
      };
    }

    const result = await createTaskCore({
      title: input.title,
      description: input.description ?? null,
      projectId: resolved?.projectId ?? null,
      assigneeId: assigneeId ?? null,
      priority: input.priority ?? "media",
      deadline: input.deadline ? new Date(input.deadline) : null,
      origin: `maestro-chat:${ctx.personId}`,
      aiExtracted: true,
      aiConfidence: MAESTRO_CHAT_CONFIDENCE,
      validationStatus: gating.type === "pending" ? "por_confirmar" : "confirmado",
    });

    if (!result.ok) return { ok: false, error: result.error };

    return {
      ok: true,
      data: {
        id: result.id,
        titulo: input.title,
        status: result.status,
        validacao: result.validationStatus,
        gating: gating.type,
        score: gating.score,
      },
      display:
        gating.type === "pending"
          ? `Criada (por confirmar): ${input.title}`
          : `Criada (confirmada): ${input.title}`,
    };
  },
};
