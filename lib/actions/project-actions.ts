"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireAdmin } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  projectCreateSchema,
  projectUpdateSchema,
  slugify,
  firstZodError,
} from "@/lib/validation/project-schema";
import type { ActionResult } from "./types";

async function ensureUniqueSlug(db: Awaited<ReturnType<typeof getTenantDb>>, slug: string, excludeId?: string): Promise<boolean> {
  const existing = await db.project.findFirst({
    where: { slug },
    select: { id: true },
  });
  if (!existing) return true;
  return excludeId ? existing.id === excludeId : false;
}

// ─── Create ─────────────────────────────────────────────────

export async function createProject(
  _prev: ActionResult<{ slug: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ slug: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    name: formData.get("name") as string ?? "",
    slug: (formData.get("slug") as string) ?? "",
    type: formData.get("type") as string,
    description: (formData.get("description") as string) ?? "",
    color: (formData.get("color") as string) ?? "",
  };

  const parsed = projectCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const slug = parsed.data.slug || slugify(parsed.data.name);
  if (!slug) return { error: "Não foi possível gerar slug a partir do nome" };

  const db = await getTenantDb();

  if (!(await ensureUniqueSlug(db, slug))) {
    return { error: `Slug "${slug}" já existe` };
  }

  try {
    await db.project.create({
      data: {
        tenantId: "",
        name: parsed.data.name,
        slug,
        type: parsed.data.type,
        description: parsed.data.description || null,
        color: parsed.data.color || null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Slug já existe" };
    }
    throw e;
  }

  revalidatePath("/");
  return { success: true, data: { slug } };
}

// ─── Update ─────────────────────────────────────────────────

export async function updateProject(
  _prev: ActionResult<{ slug: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ slug: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const currentSlug = formData.get("currentSlug") as string;
  if (!currentSlug) return { error: "Slug actual obrigatório" };

  const raw: Record<string, unknown> = {};
  for (const field of ["name", "slug", "type", "status", "health", "progress", "description", "color"] as const) {
    if (formData.has(field)) {
      const v = formData.get(field);
      if (typeof v === "string") raw[field] = v;
    }
  }

  const parsed = projectUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();

  const existing = await db.project.findFirst({
    where: { slug: currentSlug },
    select: { id: true, archivedAt: true },
  });
  if (!existing) return { error: "Projecto não encontrado" };
  if (existing.archivedAt) return { error: "Projecto arquivado não pode ser editado" };

  let finalSlug = currentSlug;
  if (parsed.data.slug && parsed.data.slug !== currentSlug) {
    if (!(await ensureUniqueSlug(db, parsed.data.slug, existing.id))) {
      return { error: `Slug "${parsed.data.slug}" já existe` };
    }
    finalSlug = parsed.data.slug;
  }

  const updateData: Prisma.ProjectUpdateInput = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.slug !== undefined) updateData.slug = finalSlug;
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.health !== undefined) updateData.health = parsed.data.health;
  if (parsed.data.progress !== undefined) updateData.progress = parsed.data.progress;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description || null;
  if (parsed.data.color !== undefined) updateData.color = parsed.data.color || null;

  try {
    await db.project.update({
      where: { id: existing.id },
      data: updateData,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Slug já existe" };
    }
    throw e;
  }

  revalidatePath("/");
  revalidatePath(`/project/${currentSlug}`);
  if (finalSlug !== currentSlug) revalidatePath(`/project/${finalSlug}`);
  return { success: true, data: { slug: finalSlug } };
}

// ─── Archive (soft delete) ──────────────────────────────────

export async function archiveProject(slug: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const project = await db.project.findFirst({
    where: { slug },
    select: { id: true, archivedAt: true },
  });
  if (!project) return { error: "Projecto não encontrado" };
  if (project.archivedAt) return { error: "Projecto já está arquivado" };

  const activeTasks = await db.task.count({
    where: {
      projectId: project.id,
      archivedAt: null,
      status: { not: "feito" },
    },
  });
  if (activeTasks > 0) {
    return {
      error: `Não é possível arquivar: ${activeTasks} task(s) ainda activa(s). Conclui-as ou move-as primeiro.`,
    };
  }

  await db.project.update({
    where: { id: project.id },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/");
  revalidatePath(`/project/${slug}`);
  return { success: true };
}
