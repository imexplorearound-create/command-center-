import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import { basePrisma } from "@/lib/db";
import type { MaestroToolDef } from "./types";
import { parseInput, revalidateTaskPaths } from "./_task-helpers";

const inputSchema = z.object({
  id: z.string().uuid(),
});

export const restaurarTarefaTool: MaestroToolDef = {
  name: "restaurar_tarefa",
  description:
    "Restaura uma tarefa arquivada. **Apenas admin** pode executar (consistente com a regra de restoreTask). Aceita só UUID — pesquisa por título não funciona em tarefas arquivadas.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "UUID da tarefa arquivada." },
    },
    required: ["id"],
  },
  async execute(rawInput, ctx) {
    const input = parseInput(inputSchema, rawInput);
    if (!input.ok) return input;

    // Gate por role no caller (chat) — admin only.
    const user = await basePrisma.user.findUnique({
      where: { id: ctx.userId },
      select: { role: true },
    });
    if (!user || user.role !== "admin") {
      return { ok: false, error: "Sem permissão: restaurar tarefas é admin-only." };
    }

    const db = await getTenantDb();
    const task = await db.task.findUnique({
      where: { id: input.data.id },
      select: {
        id: true,
        title: true,
        archivedAt: true,
        project: { select: { slug: true } },
      },
    });
    if (!task) return { ok: false, error: "Tarefa não encontrada." };
    if (!task.archivedAt) return { ok: false, error: `Tarefa "${task.title}" não está arquivada.` };

    await db.task.update({
      where: { id: task.id },
      data: { archivedAt: null },
    });
    revalidateTaskPaths(task.project?.slug ?? null);

    return {
      ok: true,
      data: { id: task.id, titulo: task.title },
      display: `↩ ${task.title} restaurada`,
    };
  },
};
