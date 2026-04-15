"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireAdmin } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  phaseCreateSchema,
  phaseUpdateSchema,
  firstZodError,
} from "@/lib/validation/project-schema";
import type { ActionResult } from "./types";

function parseDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  // UTC para evitar offset de timezone
  const d = new Date(`${s}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

async function getProjectIdBySlug(slug: string): Promise<string | null> {
  const db = await getTenantDb();
  const p = await db.project.findFirst({
    where: { slug },
    select: { id: true, archivedAt: true },
  });
  if (!p || p.archivedAt) return null;
  return p.id;
}

// ─── Create ─────────────────────────────────────────────────

export async function createPhase(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const projectSlug = formData.get("projectSlug") as string;
  if (!projectSlug) return { error: "Slug do projecto obrigatório" };

  const projectId = await getProjectIdBySlug(projectSlug);
  if (!projectId) return { error: "Projecto não encontrado ou arquivado" };

  const raw = {
    name: formData.get("name") as string ?? "",
    description: (formData.get("description") as string) ?? "",
    phaseOrder: formData.get("phaseOrder") ?? undefined,
    status: (formData.get("status") as string) || undefined,
    progress: formData.get("progress") ?? undefined,
    startDate: (formData.get("startDate") as string) ?? "",
    endDate: (formData.get("endDate") as string) ?? "",
  };

  const parsed = phaseCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();

  let order = parsed.data.phaseOrder;
  if (order === undefined) {
    const max = await db.projectPhase.aggregate({
      where: { projectId },
      _max: { phaseOrder: true },
    });
    order = (max._max.phaseOrder ?? -1) + 1;
  }

  await db.projectPhase.create({
    data: {
      tenantId: "",
      projectId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      phaseOrder: order,
      status: parsed.data.status,
      progress: parsed.data.progress,
      startDate: parseDate(parsed.data.startDate),
      endDate: parseDate(parsed.data.endDate),
    },
  });

  revalidatePath(`/project/${projectSlug}`);
  return { success: true };
}

// ─── Update ─────────────────────────────────────────────────

export async function updatePhase(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const phaseId = formData.get("id") as string;
  if (!phaseId) return { error: "ID obrigatório" };

  const db = await getTenantDb();

  const phase = await db.projectPhase.findUnique({
    where: { id: phaseId },
    select: { id: true, project: { select: { slug: true, archivedAt: true } } },
  });
  if (!phase) return { error: "Fase não encontrada" };
  if (phase.project.archivedAt) return { error: "Projecto arquivado" };

  const raw: Record<string, unknown> = {};
  for (const f of ["name", "description", "phaseOrder", "status", "progress", "startDate", "endDate"] as const) {
    if (formData.has(f)) {
      const v = formData.get(f);
      if (typeof v === "string") raw[f] = v;
    }
  }

  const parsed = phaseUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const update: Prisma.ProjectPhaseUpdateInput = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.description !== undefined) update.description = parsed.data.description || null;
  if (parsed.data.phaseOrder !== undefined) update.phaseOrder = parsed.data.phaseOrder;
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.progress !== undefined) update.progress = parsed.data.progress;
  if (parsed.data.startDate !== undefined) update.startDate = parseDate(parsed.data.startDate);
  if (parsed.data.endDate !== undefined) update.endDate = parseDate(parsed.data.endDate);

  await db.projectPhase.update({
    where: { id: phaseId },
    data: update,
  });

  revalidatePath(`/project/${phase.project.slug}`);
  return { success: true };
}

// ─── Delete ─────────────────────────────────────────────────

export async function deletePhase(phaseId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const phase = await db.projectPhase.findUnique({
    where: { id: phaseId },
    select: { id: true, project: { select: { slug: true } } },
  });
  if (!phase) return { error: "Fase não encontrada" };

  const linkedTasks = await db.task.count({
    where: { phaseId },
  });
  if (linkedTasks > 0) {
    return {
      error: `Não é possível apagar: ${linkedTasks} task(s) ligada(s) a esta fase. Move-as primeiro.`,
    };
  }

  await db.projectPhase.delete({ where: { id: phaseId } });
  revalidatePath(`/project/${phase.project.slug}`);
  return { success: true };
}

// ─── Reorder (batch) ────────────────────────────────────────

export async function reorderPhases(
  projectSlug: string,
  phases: { id: string; phaseOrder: number }[]
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const projectId = await getProjectIdBySlug(projectSlug);
  if (!projectId) return { error: "Projecto não encontrado ou arquivado" };

  const db = await getTenantDb();

  // Anti-tampering: garantir que todas as fases pertencem ao projecto
  const ids = phases.map((p) => p.id);
  const existing = await db.projectPhase.findMany({
    where: { id: { in: ids }, projectId },
    select: { id: true },
  });
  if (existing.length !== phases.length) {
    return { error: "Algumas fases não pertencem a este projecto" };
  }

  await db.$transaction(
    phases.map((p) =>
      db.projectPhase.update({
        where: { id: p.id },
        data: { phaseOrder: p.phaseOrder },
      })
    )
  );

  revalidatePath(`/project/${projectSlug}`);
  return { success: true };
}
