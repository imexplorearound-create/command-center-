import "server-only";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant";

export interface TaskCreateCoreInput {
  title: string;
  description?: string | null;
  projectId?: string | null;
  phaseId?: string | null;
  areaId?: string | null;
  assigneeId?: string | null;
  status?: string;
  priority?: string;
  deadline?: Date | null;
  origin?: string | null;
  validationStatus?: string;
  aiExtracted?: boolean;
  aiConfidence?: number | null;
}

export interface TaskCreateCoreResult {
  ok: true;
  id: string;
  status: string;
  validationStatus: string;
}

export type TaskCreateCoreError = { ok: false; error: string };

/**
 * Internal helper used by both the createTask Server Action and the Maestro
 * `criar_tarefa` tool. Computes kanbanOrder, persists, and revalidates routes.
 *
 * Auth must be checked by the caller.
 */
export async function createTaskCore(
  input: TaskCreateCoreInput
): Promise<TaskCreateCoreResult | TaskCreateCoreError> {
  const db = await getTenantDb();

  const status = input.status ?? "backlog";
  const projectId = input.projectId ?? null;

  const last = await db.task.findFirst({
    where: { projectId, status, archivedAt: null },
    orderBy: { kanbanOrder: "desc" },
    select: { kanbanOrder: true },
  });
  const kanbanOrder = (last?.kanbanOrder ?? -1) + 1;

  let created: {
    id: string;
    status: string;
    validationStatus: string;
    project: { slug: string } | null;
  };
  try {
    created = await db.task.create({
      data: {
        tenantId: "",
        title: input.title,
        description: input.description ?? null,
        projectId,
        phaseId: input.phaseId ?? null,
        areaId: input.areaId ?? null,
        assigneeId: input.assigneeId ?? null,
        status,
        priority: input.priority ?? "media",
        deadline: input.deadline ?? null,
        origin: input.origin ?? null,
        kanbanOrder,
        aiExtracted: input.aiExtracted ?? false,
        aiConfidence: input.aiConfidence ?? null,
        validationStatus: input.validationStatus ?? "confirmado",
      },
      select: {
        id: true,
        status: true,
        validationStatus: true,
        project: { select: { slug: true } },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return { ok: false, error: `Erro ao criar tarefa (${e.code})` };
    }
    throw e;
  }

  revalidatePath("/");
  if (created.project?.slug) revalidatePath(`/project/${created.project.slug}`);

  return {
    ok: true,
    id: created.id,
    status: created.status,
    validationStatus: created.validationStatus,
  };
}
