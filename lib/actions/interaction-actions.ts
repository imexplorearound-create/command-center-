"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireWriter } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import {
  interactionCreateSchema,
  interactionUpdateSchema,
} from "@/lib/validation/interaction-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import type { ActionResult } from "./types";
import { field, emptyToNull } from "./form-helpers";

// ─── Helpers ────────────────────────────────────────────────

function participantsFromForm(fd: FormData): string[] {
  const raw = fd.getAll("participants");
  return raw.filter((v): v is string => typeof v === "string" && v.length > 0);
}

async function projectSlugById(projectId: string | null): Promise<string | null> {
  if (!projectId) return null;
  const db = await getTenantDb();
  const p = await db.project.findUnique({
    where: { id: projectId },
    select: { slug: true },
  });
  return p?.slug ?? null;
}

function revalidateInteractionPaths(slug: string | null) {
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/project/${slug}`);
    revalidatePath(`/project/${slug}/client`);
  }
}

// ─── Create ─────────────────────────────────────────────────

export async function createInteraction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    title: field(formData, "title") ?? "",
    type: field(formData, "type") ?? "",
    body: field(formData, "body") ?? "",
    interactionDate: field(formData, "interactionDate") ?? "",
    participants: participantsFromForm(formData),
    source: field(formData, "source") ?? "",
    sourceRef: field(formData, "sourceRef") ?? "",
    clientId: field(formData, "clientId") ?? "",
    projectId: field(formData, "projectId") ?? "",
  };

  const parsed = interactionCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const db = await getTenantDb();

  const [interaction] = await db.$transaction([
    db.interaction.create({
      data: {
        tenantId: "",
        title: data.title,
        type: data.type,
        body: emptyToNull(data.body),
        interactionDate: new Date(data.interactionDate),
        participants: data.participants,
        source: emptyToNull(data.source),
        sourceRef: emptyToNull(data.sourceRef),
        clientId: data.clientId,
        projectId: emptyToNull(data.projectId),
      },
    }),
    db.client.update({
      where: { id: data.clientId },
      data: { lastInteractionAt: new Date(), daysSinceContact: 0 },
    }),
  ]);

  const slug = await projectSlugById(emptyToNull(data.projectId));
  revalidateInteractionPaths(slug);
  return { success: true, data: { id: interaction.id } };
}

// ─── Update ─────────────────────────────────────────────────

export async function updateInteraction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const id = field(formData, "id");
  if (!id) return { error: "ID da interação obrigatório" };

  const raw: Record<string, unknown> = {};
  for (const key of ["title", "type", "body", "interactionDate", "source", "sourceRef"] as const) {
    const v = field(formData, key);
    if (v !== undefined) raw[key] = v;
  }
  const participants = participantsFromForm(formData);
  if (participants.length > 0) raw.participants = participants;

  const parsed = interactionUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const db = await getTenantDb();

  const existing = await db.interaction.findUnique({
    where: { id },
    select: { id: true, projectId: true },
  });
  if (!existing) return { error: "Interação não encontrada" };

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.body !== undefined) updateData.body = emptyToNull(data.body);
  if (data.interactionDate !== undefined) updateData.interactionDate = new Date(data.interactionDate);
  if (data.participants !== undefined) updateData.participants = data.participants;
  if (data.source !== undefined) updateData.source = emptyToNull(data.source);
  if (data.sourceRef !== undefined) updateData.sourceRef = emptyToNull(data.sourceRef);

  await db.interaction.update({ where: { id }, data: updateData });

  const slug = await projectSlugById(existing.projectId);
  revalidateInteractionPaths(slug);
  return { success: true, data: { id } };
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteInteraction(id: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const interaction = await db.interaction.findUnique({
    where: { id },
    select: { id: true, projectId: true },
  });
  if (!interaction) return { error: "Interação não encontrada" };

  await db.interaction.delete({ where: { id } });

  const slug = await projectSlugById(interaction.projectId);
  revalidateInteractionPaths(slug);
  return { success: true };
}
