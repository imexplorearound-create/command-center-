import "server-only";
import { z } from "zod";
import { taskStatusEnum } from "@/lib/validation/task-schema";
import { getTenantDb } from "@/lib/tenant";
import { toDateStr } from "@/lib/agent-helpers";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  projectSlug: z.string().optional(),
  status: taskStatusEnum.optional(),
  assigneeName: z.string().optional(),
  includeArchived: z.boolean().optional(),
  onlyArchived: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const listarTarefasTool: MaestroToolDef = {
  name: "listar_tarefas",
  description:
    "Lista tarefas não-arquivadas com filtros opcionais. Use para responder perguntas como 'que tarefas tem a Maria?' ou 'mostra-me o backlog do Aura PMS'. Para ver arquivadas usa includeArchived ou onlyArchived.",
  inputSchema: {
    type: "object",
    properties: {
      projectSlug: {
        type: "string",
        description:
          "Slug do projecto (ex: 'aura-pms'). Use listar_projectos primeiro se não souber o slug.",
      },
      status: {
        type: "string",
        enum: [...taskStatusEnum.options],
        description: "Filtra por estado da tarefa.",
      },
      assigneeName: {
        type: "string",
        description: "Nome (ou parte) do responsável.",
      },
      includeArchived: {
        type: "boolean",
        description: "Se true, inclui tarefas arquivadas no resultado. Default false.",
      },
      onlyArchived: {
        type: "boolean",
        description: "Se true, devolve APENAS arquivadas (ignora includeArchived). Default false.",
      },
      limit: {
        type: "number",
        description: "Máximo de tarefas (default 20).",
      },
    },
    required: [],
  },
  async execute(rawInput) {
    const parsed = inputSchema.safeParse(rawInput ?? {});
    if (!parsed.success) {
      return { ok: false, error: "Input inválido para listar_tarefas" };
    }

    const where: Record<string, unknown> = {};
    if (parsed.data.onlyArchived) where.archivedAt = { not: null };
    else if (!parsed.data.includeArchived) where.archivedAt = null;
    if (parsed.data.status) where.status = parsed.data.status;
    if (parsed.data.projectSlug) {
      where.project = { slug: parsed.data.projectSlug };
    }
    if (parsed.data.assigneeName) {
      where.assignee = {
        name: { contains: parsed.data.assigneeName, mode: "insensitive" },
      };
    }

    const db = await getTenantDb();
    const orderBy = parsed.data.onlyArchived
      ? [{ archivedAt: "desc" as const }]
      : [{ status: "asc" as const }, { kanbanOrder: "asc" as const }];
    const tasks = await db.task.findMany({
      where,
      orderBy,
      take: parsed.data.limit ?? 20,
      include: {
        project: { select: { name: true, slug: true } },
        assignee: { select: { name: true } },
      },
    });

    return {
      ok: true,
      data: tasks.map((t) => ({
        id: t.id,
        titulo: t.title,
        projecto: t.project?.name ?? null,
        projectoSlug: t.project?.slug ?? null,
        responsavel: t.assignee?.name ?? null,
        status: t.status,
        prioridade: t.priority,
        prazo: toDateStr(t.deadline),
        validacao: t.validationStatus,
        arquivada: t.archivedAt !== null,
      })),
      display: `${tasks.length} tarefa(s)`,
    };
  },
};
