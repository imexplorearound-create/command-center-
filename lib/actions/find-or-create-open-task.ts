import "server-only";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import type { TenantPrisma } from "@/lib/db";

export type FindOrCreateOpenTaskInput = {
  tenantId: string;
  testCaseId: string;
  projectId: string;
  title: string;
  description?: string | null;
  priority?: string;
  origin?: string;
  originRef?: string;
};

export type FindOrCreateOpenTaskResult =
  | { id: string; created: true }
  | { id: string; created: false };

/**
 * Atomic INSERT ... ON CONFLICT DO NOTHING RETURNING id, arbitrado pelo
 * partial unique index `tasks_open_testcase_unique`. Se já existe uma Task
 * aberta (status != 'feito' AND archived_at IS NULL) para este TestCase,
 * devolve o id dela. Caso contrário, cria uma nova.
 *
 * Prisma não suporta partial unique em `upsert` nativamente, por isso raw SQL.
 * IMPORTANTE: `$queryRaw` NÃO passa pelo middleware de `$extends` — o
 * `tenantId` tem de ser passado explicitamente.
 */
export async function findOrCreateOpenTaskForTestCase(
  db: TenantPrisma,
  input: FindOrCreateOpenTaskInput,
): Promise<FindOrCreateOpenTaskResult> {
  const id = randomUUID();
  // kanban_order computed via subquery para evitar round-trip extra e
  // estreitar a janela de race com outros inserts concorrentes no mesmo
  // projeto (não é unique — colisões ocasionais são apenas cosméticas).
  const rows = await db.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      INSERT INTO tasks (
        id, tenant_id, title, description, project_id, status, priority,
        origin, origin_ref, kanban_order, test_case_id
      )
      VALUES (
        ${id}::uuid, ${input.tenantId}::uuid, ${input.title}, ${input.description ?? null},
        ${input.projectId}::uuid, 'a_fazer', ${input.priority ?? "media"},
        ${input.origin ?? null}, ${input.originRef ?? null},
        COALESCE((
          SELECT MAX(kanban_order) FROM tasks
          WHERE project_id = ${input.projectId}::uuid
            AND status = 'a_fazer'
            AND archived_at IS NULL
        ), -1) + 1,
        ${input.testCaseId}::uuid
      )
      ON CONFLICT (test_case_id)
        WHERE status <> 'feito' AND archived_at IS NULL AND test_case_id IS NOT NULL
        DO NOTHING
      RETURNING id
    `,
  );

  if (rows.length > 0) {
    return { id: rows[0]!.id, created: true };
  }

  // Conflict: outra aprovação concorrente ganhou. Encontra a Task aberta.
  const existing = await db.task.findFirst({
    where: {
      testCaseId: input.testCaseId,
      status: { not: "feito" },
      archivedAt: null,
    },
    select: { id: true },
  });
  if (!existing) {
    // Caso raro: o index impediu o insert mas a row já não existe (arquivada
    // entre o conflict e o SELECT). Trata como "try again" do caller.
    throw new Error("Task conflict but no open task found — retry approve");
  }
  return { id: existing.id, created: false };
}
