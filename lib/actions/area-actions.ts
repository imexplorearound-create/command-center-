"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireAdmin } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  areaCreateSchema,
  areaUpdateSchema,
  slugify,
} from "@/lib/validation/area-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import { field, emptyToNull } from "./form-helpers";
import type { ActionResult } from "./types";

function revalidateAreas() {
  revalidatePath("/areas");
  revalidatePath("/");
}

export async function createArea(
  _prev: ActionResult<{ slug: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ slug: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    name: field(formData, "name") ?? "",
    slug: field(formData, "slug") ?? "",
    description: field(formData, "description") ?? "",
    color: field(formData, "color") ?? "",
    icon: field(formData, "icon") ?? "",
    ownerId: field(formData, "ownerId") ?? "",
  };

  const parsed = areaCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const slug = data.slug || slugify(data.name);
  if (!slug) return { error: "Não foi possível gerar slug a partir do nome" };

  const db = await getTenantDb();

  try {
    await db.area.create({
      data: {
        tenantId: "",
        name: data.name,
        slug,
        description: emptyToNull(data.description),
        color: emptyToNull(data.color),
        icon: emptyToNull(data.icon),
        ownerId: emptyToNull(data.ownerId),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `Slug "${slug}" já existe` };
    }
    throw e;
  }

  revalidateAreas();
  return { success: true, data: { slug } };
}

export async function updateArea(
  _prev: ActionResult<{ slug: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ slug: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const currentSlug = field(formData, "currentSlug");
  if (!currentSlug) return { error: "Slug actual obrigatório" };

  const raw: Record<string, unknown> = {};
  for (const key of ["name", "slug", "description", "color", "icon", "ownerId"] as const) {
    const v = field(formData, key);
    if (v !== undefined) raw[key] = v;
  }

  const parsed = areaUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const db = await getTenantDb();

  const existing = await db.area.findFirst({
    where: { slug: currentSlug },
    select: { id: true, archivedAt: true },
  });
  if (!existing) return { error: "Área não encontrada" };
  if (existing.archivedAt) return { error: "Área arquivada não pode ser editada" };

  const finalSlug = data.slug && data.slug !== currentSlug ? data.slug : currentSlug;

  const updateData: Prisma.AreaUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = finalSlug;
  if (data.description !== undefined) updateData.description = emptyToNull(data.description);
  if (data.color !== undefined) updateData.color = emptyToNull(data.color);
  if (data.icon !== undefined) updateData.icon = emptyToNull(data.icon);
  if (data.ownerId !== undefined) {
    const v = emptyToNull(data.ownerId);
    updateData.owner = v ? { connect: { id: v } } : { disconnect: true };
  }

  try {
    await db.area.update({ where: { id: existing.id }, data: updateData });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `Slug "${finalSlug}" já existe` };
    }
    throw e;
  }

  revalidateAreas();
  return { success: true, data: { slug: finalSlug } };
}

export async function archiveArea(slug: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const area = await db.area.findFirst({
    where: { slug },
    select: {
      id: true,
      archivedAt: true,
      _count: {
        select: {
          tasks: { where: { archivedAt: null, status: { not: "feito" } } },
          workflowTemplates: true,
          workflowInstances: { where: { status: "em_curso" } },
        },
      },
    },
  });
  if (!area) return { error: "Área não encontrada" };
  if (area.archivedAt) return { error: "Área já está arquivada" };

  if (area._count.tasks > 0) {
    return {
      error: `Não é possível arquivar: ${area._count.tasks} tarefa(s) activa(s) ligada(s).`,
    };
  }
  if (area._count.workflowTemplates > 0) {
    return {
      error: `Não é possível arquivar: ${area._count.workflowTemplates} workflow template(s) ligado(s).`,
    };
  }
  if (area._count.workflowInstances > 0) {
    return {
      error: `Não é possível arquivar: ${area._count.workflowInstances} workflow(s) em curso.`,
    };
  }

  await db.area.update({
    where: { id: area.id },
    data: { archivedAt: new Date() },
  });

  revalidateAreas();
  return { success: true };
}

export async function restoreArea(slug: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const area = await db.area.findFirst({
    where: { slug },
    select: { id: true, archivedAt: true },
  });
  if (!area) return { error: "Área não encontrada" };
  if (!area.archivedAt) return { error: "Área não está arquivada" };

  await db.area.update({
    where: { id: area.id },
    data: { archivedAt: null },
  });

  revalidateAreas();
  return { success: true };
}
