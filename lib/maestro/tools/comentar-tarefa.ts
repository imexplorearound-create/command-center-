import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import type { MaestroToolDef } from "./types";
import { parseInput, resolveTaskOrError, revalidateTaskPaths } from "./_task-helpers";

const inputSchema = z.object({
  idOrTitle: z.string().min(1),
  comment: z.string().min(1).max(2000),
});

/**
 * TODO(P2): criar modelo TaskComment dedicado. Por agora apendamos à description
 * com marcador `[Maestro YYYY-MM-DD HH:mm]` para ser parseável se migrarmos.
 */
export const comentarTarefaTool: MaestroToolDef = {
  name: "comentar_tarefa",
  description:
    "Adiciona uma nota/comentário a uma tarefa. O comentário fica no fim da descrição com timestamp e marcador [Maestro].",
  inputSchema: {
    type: "object",
    properties: {
      idOrTitle: { type: "string", description: "UUID da tarefa ou parte do título." },
      comment: { type: "string", description: "Texto do comentário (até 2000 chars)." },
    },
    required: ["idOrTitle", "comment"],
  },
  async execute(rawInput) {
    const input = parseInput(inputSchema, rawInput);
    if (!input.ok) return input;

    const db = await getTenantDb();
    const resolveResult = await resolveTaskOrError(db, input.data.idOrTitle);
    if (!resolveResult.ok) return resolveResult;
    const { task } = resolveResult;

    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const newDescription = (task.description ?? "") + `\n\n[Maestro ${stamp}] ${input.data.comment}`;

    await db.task.update({ where: { id: task.id }, data: { description: newDescription } });
    revalidateTaskPaths(task.projectSlug);

    return {
      ok: true,
      data: { id: task.id, titulo: task.title },
      display: `Comentário adicionado a ${task.title}`,
    };
  },
};
