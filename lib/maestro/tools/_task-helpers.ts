import "server-only";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import type { ZodSafeParseResult, ZodType } from "zod";
import { resolveTaskByIdOrTitle, type ResolvedTask } from "@/lib/agent-helpers";
import type { TenantPrisma } from "@/lib/db";

interface ToolError {
  ok: false;
  error: string;
}

export function parseInput<T extends ZodType>(
  schema: T,
  raw: unknown
): { ok: true; data: z.infer<T> } | ToolError {
  const parsed: ZodSafeParseResult<z.infer<T>> = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Input inválido: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Resolve uma tarefa e devolve ou a tarefa, ou um erro já formatado (para o
 * caller fazer `return` directo).
 */
export async function resolveTaskOrError(
  db: TenantPrisma,
  idOrTitle: string
): Promise<{ ok: true; task: ResolvedTask } | ToolError> {
  const r = await resolveTaskByIdOrTitle(db, idOrTitle);
  if (r.kind === "not_found") {
    return { ok: false, error: `Tarefa não encontrada: "${idOrTitle}".` };
  }
  if (r.kind === "ambiguous") {
    const titles = r.matches.map((m) => `"${m.title}"`).join(", ");
    return {
      ok: false,
      error: `Várias tarefas correspondem a "${idOrTitle}": ${titles}. Sê mais específico ou usa o UUID.`,
    };
  }
  return { ok: true, task: r.task };
}

/**
 * Revalida as rotas afectadas por uma mudança numa tarefa:
 * dashboard (`/`) + página do projecto se houver slug.
 */
export function revalidateTaskPaths(projectSlug: string | null | undefined) {
  revalidatePath("/");
  if (projectSlug) revalidatePath(`/project/${projectSlug}`);
}
