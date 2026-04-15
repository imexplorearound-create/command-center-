"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireWriter } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { opportunityCreateSchema, opportunityUpdateSchema } from "@/lib/validation/opportunity-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import type { ActionResult } from "./types";

// ─── Create ─────────────────────────────────────────────────

export async function createOpportunity(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    title: formData.get("title") as string,
    stageId: formData.get("stageId") as string || "contacto_inicial",
    value: formData.get("value") as string || undefined,
    probability: formData.get("probability") as string || "0",
    contactId: formData.get("contactId") as string || undefined,
    ownerId: formData.get("ownerId") as string || undefined,
    companyName: formData.get("companyName") as string || undefined,
    companyNif: formData.get("companyNif") as string || undefined,
    expectedClose: formData.get("expectedClose") as string || undefined,
    source: formData.get("source") as string || undefined,
  };

  const parsed = opportunityCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();

  // Calculate next kanbanOrder for the stage
  const lastInStage = await db.opportunity.findFirst({
    where: { stageId: parsed.data.stageId, archivedAt: null },
    orderBy: { kanbanOrder: "desc" },
    select: { kanbanOrder: true },
  });

  const opp = await db.opportunity.create({
    data: {
      tenantId: "",
      ...parsed.data,
      kanbanOrder: (lastInStage?.kanbanOrder ?? -1) + 1,
      value: parsed.data.value != null ? parsed.data.value : null,
    },
  });

  revalidatePath("/crm");
  revalidatePath("/");
  return { success: true, data: { id: opp.id } };
}

// ─── Update ─────────────────────────────────────────────────

export async function updateOpportunity(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const id = formData.get("id") as string;
  if (!id) return { error: "ID obrigatório" };

  const raw: Record<string, unknown> = {};
  for (const key of ["title", "stageId", "value", "probability", "contactId", "ownerId", "companyName", "companyNif", "expectedClose", "source"]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const parsed = opportunityUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  const existing = await db.opportunity.findFirst({ where: { id } });
  if (!existing) return { error: "Oportunidade não encontrada" };
  if (existing.archivedAt) return { error: "Oportunidade arquivada" };

  // If stage changed, update stageEnteredAt
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.stageId && parsed.data.stageId !== existing.stageId) {
    data.stageEnteredAt = new Date();
  }
  // Handle closedAt for final stages
  if (parsed.data.stageId === "ganho" || parsed.data.stageId === "perdido") {
    if (!existing.closedAt) data.closedAt = new Date();
  } else if (parsed.data.stageId && existing.closedAt) {
    data.closedAt = null;
  }

  await db.opportunity.update({ where: { id }, data });

  revalidatePath("/crm");
  revalidatePath(`/crm/${id}`);
  revalidatePath("/");
  return { success: true };
}

// ─── Move (kanban drag & drop) ──────────────────────────────

export async function moveOpportunity(
  id: string,
  toStage: string,
  toIndex: number
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const opp = await db.opportunity.findFirst({ where: { id } });
  if (!opp) return { error: "Oportunidade não encontrada" };

  const stageChanged = opp.stageId !== toStage;

  // Get all opps in target stage (excluding the moving one)
  const stageOpps = await db.opportunity.findMany({
    where: { stageId: toStage, archivedAt: null, id: { not: id } },
    orderBy: { kanbanOrder: "asc" },
    select: { id: true },
  });

  // Insert at the target index
  const reordered = [...stageOpps.map(o => o.id)];
  reordered.splice(toIndex, 0, id);

  // Update all positions + the moved opp's stage
  await db.$transaction(
    reordered.map((oppId, idx) =>
      db.opportunity.update({
        where: { id: oppId },
        data: {
          kanbanOrder: idx,
          ...(oppId === id ? {
            stageId: toStage,
            ...(stageChanged ? { stageEnteredAt: new Date() } : {}),
            // Auto-close on final stages
            ...((toStage === "ganho" || toStage === "perdido") && !opp.closedAt ? { closedAt: new Date() } : {}),
            // Re-open if moved from final stage
            ...(stageChanged && (opp.stageId === "ganho" || opp.stageId === "perdido") && (toStage !== "ganho" && toStage !== "perdido") ? { closedAt: null } : {}),
          } : {}),
        },
      })
    )
  );

  revalidatePath("/crm");
  revalidatePath("/");
  return { success: true };
}

// ─── Archive (soft delete) ──────────────────────────────────

export async function archiveOpportunity(id: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const existing = await db.opportunity.findFirst({ where: { id } });
  if (!existing) return { error: "Oportunidade não encontrada" };
  if (existing.archivedAt) return { error: "Oportunidade já arquivada" };

  await db.opportunity.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/crm");
  revalidatePath("/");
  return { success: true };
}

// ─── Convert to Project ─────────────────────────────────────

export async function convertToProject(opportunityId: string): Promise<ActionResult<{ projectId: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const opp = await db.opportunity.findFirst({
    where: { id: opportunityId },
    include: { contact: { select: { id: true, name: true } } },
  });
  if (!opp) return { error: "Oportunidade não encontrada" };
  if (opp.convertedProjectId) return { error: "Já convertida em projecto" };

  // Create project from opportunity data
  const slug = opp.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

  const project = await db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        tenantId: "",
        name: opp.title,
        slug: slug + "-" + Date.now().toString(36),
        type: "cliente",
        description: [
          opp.companyName ? `Empresa: ${opp.companyName}` : null,
          opp.value ? `Valor: ${opp.value} ${opp.currency}` : null,
          opp.source ? `Origem: ${opp.source}` : null,
        ].filter(Boolean).join("\n"),
      },
    });

    // Link opportunity to project
    await tx.opportunity.update({
      where: { id: opportunityId },
      data: { convertedProjectId: project.id, stageId: "ganho", closedAt: new Date(), stageEnteredAt: new Date() },
    });

    // Create client + contact if there's a contact person
    if (opp.contactId) {
      const client = await tx.client.create({
        data: {
          tenantId: "",
          companyName: opp.companyName || opp.title,
          projectId: project.id,
        },
      });
      await tx.clientContact.create({
        data: {
          tenantId: "",
          clientId: client.id,
          personId: opp.contactId,
          isPrimary: true,
        },
      });
    }

    return project;
  });

  revalidatePath("/crm");
  revalidatePath("/");
  return { success: true, data: { projectId: project.id } };
}
