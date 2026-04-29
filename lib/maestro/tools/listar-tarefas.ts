import "server-only";
import { z } from "zod";
import { taskStatusEnum, validationStatusEnum } from "@/lib/validation/task-schema";
import { getTenantDb } from "@/lib/tenant";
import { toDateStr } from "@/lib/agent-helpers";
import type { MaestroToolDef } from "./types";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)");

const inputSchema = z.object({
  projectSlug: z.string().optional(),
  status: taskStatusEnum.optional(),
  assigneeName: z.string().optional(),
  includeArchived: z.boolean().optional(),
  onlyArchived: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).optional(),
  dueBefore: dateOnly.optional(),
  dueAfter: dateOnly.optional(),
  overdue: z.boolean().optional(),
  validationStatus: validationStatusEnum.optional(),
});

export const listarTarefasTool: MaestroToolDef = {
  name: "listar_tarefas",
  description:
    "Lista tarefas não-arquivadas com filtros opcionais. Use para perguntas como 'que tarefas tem a Maria?', 'tarefas para hoje' (dueBefore+dueAfter=hoje), 'tarefas atrasadas' (overdue:true), 'tarefas pendentes de validação' (validationStatus:'por_confirmar').",
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
      dueBefore: {
        type: "string",
        description: "Data YYYY-MM-DD. Tarefas com prazo <= esta data (inclusive). Para 'hoje', passar a data de hoje.",
      },
      dueAfter: {
        type: "string",
        description: "Data YYYY-MM-DD. Tarefas com prazo >= esta data (inclusive).",
      },
      overdue: {
        type: "boolean",
        description: "Se true, devolve APENAS tarefas com prazo < hoje E que não estão 'feito'. Atalho para 'tarefas atrasadas'.",
      },
      validationStatus: {
        type: "string",
        enum: [...validationStatusEnum.options],
        description: "Filtra por estado de validação. Use 'por_confirmar' para 'tarefas pendentes'.",
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
    if (parsed.data.validationStatus) {
      where.validationStatus = parsed.data.validationStatus;
    }

    const deadlineFilter: { gte?: Date; lte?: Date; lt?: Date } = {};
    if (parsed.data.dueAfter) deadlineFilter.gte = new Date(parsed.data.dueAfter);
    if (parsed.data.dueBefore) deadlineFilter.lte = new Date(parsed.data.dueBefore);

    if (parsed.data.overdue) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      deadlineFilter.lt = today;
      // overdue ⇒ não interessa quem é "feito"
      if (!parsed.data.status) {
        where.status = { not: "feito" };
      }
    }

    if (Object.keys(deadlineFilter).length > 0) {
      where.deadline = deadlineFilter;
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
