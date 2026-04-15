"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireWriter } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import {
  contentCreateSchema,
  contentUpdateSchema,
  contentMoveSchema,
} from "@/lib/validation/content-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import type { ActionResult } from "./types";
import type { ContentStatus } from "@/lib/types";
import { field, emptyToNull } from "./form-helpers";

// ─── Helpers ────────────────────────────────────────────────

function revalidateContentPaths() {
  revalidatePath("/");
  revalidatePath("/content");
}

// ─── Create ─────────────────────────────────────────────────

export async function createContent(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    title: field(formData, "title") ?? "",
    format: field(formData, "format") ?? undefined,
    status: field(formData, "status") ?? "proposta",
    platform: field(formData, "platform") ?? "",
    sourceCallDate: field(formData, "sourceCallDate") ?? "",
    projectId: field(formData, "projectId") ?? "",
  };

  const parsed = contentCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const db = await getTenantDb();

  const item = await db.contentItem.create({
    data: {
      tenantId: "",
      title: data.title,
      format: data.format ?? null,
      status: data.status,
      platform: emptyToNull(data.platform),
      sourceCallDate: data.sourceCallDate ? new Date(data.sourceCallDate) : null,
      projectId: emptyToNull(data.projectId),
    },
  });

  revalidateContentPaths();
  return { success: true, data: { id: item.id } };
}

// ─── Update ─────────────────────────────────────────────────

export async function updateContent(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const id = field(formData, "id");
  if (!id) return { error: "ID do conteúdo obrigatório" };

  const raw: Record<string, unknown> = {};
  for (const key of ["title", "format", "status", "platform", "sourceCallDate", "projectId"] as const) {
    const v = field(formData, key);
    if (v !== undefined) raw[key] = v;
  }

  const parsed = contentUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const db = await getTenantDb();

  const existing = await db.contentItem.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { error: "Conteúdo não encontrado" };

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.format !== undefined) updateData.format = data.format;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.platform !== undefined) updateData.platform = emptyToNull(data.platform);
  if (data.sourceCallDate !== undefined)
    updateData.sourceCallDate = data.sourceCallDate ? new Date(data.sourceCallDate) : null;
  if (data.projectId !== undefined) {
    const v = emptyToNull(data.projectId);
    updateData.projectId = v;
  }

  await db.contentItem.update({ where: { id }, data: updateData });

  revalidateContentPaths();
  return { success: true, data: { id } };
}

// ─── Move (drag & drop) ────────────────────────────────────

export async function moveContent(
  id: string,
  input: { toStatus: ContentStatus }
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const parsed = contentMoveSchema.safeParse(input);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const { toStatus } = parsed.data;

  const db = await getTenantDb();

  const item = await db.contentItem.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!item) return { error: "Conteúdo não encontrado" };
  if (item.status === toStatus) return { success: true };

  const updateData: Record<string, unknown> = { status: toStatus };

  if (toStatus === "publicado" && item.status !== "publicado") {
    updateData.publishedAt = new Date();
  }
  if (toStatus === "aprovado" && item.status !== "aprovado") {
    updateData.approvedAt = new Date();
    updateData.approvedById = auth.user.personId;
  }

  await db.contentItem.update({ where: { id }, data: updateData });

  revalidateContentPaths();
  return { success: true };
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteContent(id: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const item = await db.contentItem.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!item) return { error: "Conteúdo não encontrado" };

  await db.contentItem.delete({ where: { id } });

  revalidateContentPaths();
  return { success: true };
}
