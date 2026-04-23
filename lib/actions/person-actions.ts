"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireAdmin } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  personCreateSchema,
  personUpdateSchema,
} from "@/lib/validation/person-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import { field, emptyToNull } from "./form-helpers";
import type { ActionResult } from "./types";

function revalidatePeople() {
  revalidatePath("/people");
  revalidatePath("/");
}

export async function createPerson(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    name: field(formData, "name") ?? "",
    email: field(formData, "email") ?? "",
    role: field(formData, "role") ?? "",
    type: field(formData, "type") ?? "equipa",
    avatarColor: field(formData, "avatarColor") ?? "",
    githubUsername: field(formData, "githubUsername") ?? "",
  };

  const parsed = personCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const db = await getTenantDb();

  let created: { id: string };
  try {
    created = await db.person.create({
      data: {
        tenantId: "",
        name: data.name,
        email: emptyToNull(data.email),
        role: emptyToNull(data.role),
        type: data.type,
        avatarColor: emptyToNull(data.avatarColor),
        githubUsername: emptyToNull(data.githubUsername),
      },
      select: { id: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Email já existe" };
    }
    throw e;
  }

  revalidatePeople();
  return { success: true, data: { id: created.id } };
}

export async function updatePerson(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const id = field(formData, "id");
  if (!id) return { error: "ID obrigatório" };

  const raw: Record<string, unknown> = {};
  for (const key of ["name", "email", "role", "type", "avatarColor", "githubUsername"] as const) {
    const v = field(formData, key);
    if (v !== undefined) raw[key] = v;
  }

  const parsed = personUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const db = await getTenantDb();

  const existing = await db.person.findUnique({
    where: { id },
    select: { id: true, archivedAt: true },
  });
  if (!existing) return { error: "Pessoa não encontrada" };
  if (existing.archivedAt) return { error: "Pessoa arquivada não pode ser editada" };

  const updateData: Prisma.PersonUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = emptyToNull(data.email);
  if (data.role !== undefined) updateData.role = emptyToNull(data.role);
  if (data.type !== undefined) updateData.type = data.type;
  if (data.avatarColor !== undefined) updateData.avatarColor = emptyToNull(data.avatarColor);
  if (data.githubUsername !== undefined)
    updateData.githubUsername = emptyToNull(data.githubUsername);

  try {
    await db.person.update({ where: { id }, data: updateData });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Email já existe" };
    }
    throw e;
  }

  revalidatePeople();
  return { success: true, data: { id } };
}

export async function archivePerson(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const person = await db.person.findUnique({
    where: { id },
    select: {
      id: true,
      archivedAt: true,
      _count: {
        select: {
          tasks: { where: { archivedAt: null, status: { not: "feito" } } },
          workflowDefaultAssignee: true,
        },
      },
    },
  });
  if (!person) return { error: "Pessoa não encontrada" };
  if (person.archivedAt) return { error: "Pessoa já está arquivada" };

  if (person._count.tasks > 0) {
    return {
      error: `Não é possível arquivar: ${person._count.tasks} tarefa(s) activa(s) atribuída(s). Re-atribui ou conclui primeiro.`,
    };
  }
  if (person._count.workflowDefaultAssignee > 0) {
    return {
      error: `Não é possível arquivar: pessoa é assignee default em ${person._count.workflowDefaultAssignee} workflow template(s).`,
    };
  }

  await db.person.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  revalidatePeople();
  return { success: true };
}

export async function restorePerson(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const person = await db.person.findUnique({
    where: { id },
    select: { id: true, archivedAt: true },
  });
  if (!person) return { error: "Pessoa não encontrada" };
  if (!person.archivedAt) return { error: "Pessoa não está arquivada" };

  await db.person.update({ where: { id }, data: { archivedAt: null } });

  revalidatePeople();
  return { success: true };
}
