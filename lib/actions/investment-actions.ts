"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireWriter } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import {
  investmentMapCreateSchema,
  investmentMapUpdateSchema,
  investmentRubricCreateSchema,
  investmentRubricUpdateSchema,
} from "@/lib/validation/investment-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import type { ActionResult } from "./types";

// ─── Investment Map: Create ────────────────────────────────

export async function createInvestmentMap(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    projectId: formData.get("projectId") as string,
    totalBudget: formData.get("totalBudget") as string,
    fundingSource: formData.get("fundingSource") as string || undefined,
    fundingPercentage: formData.get("fundingPercentage") as string || undefined,
    startDate: formData.get("startDate") as string || undefined,
    endDate: formData.get("endDate") as string || undefined,
  };

  const parsed = investmentMapCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();

  // Check if project already has a map
  const existing = await db.investmentMap.findFirst({
    where: { projectId: parsed.data.projectId, archivedAt: null },
  });
  if (existing) return { error: "Projecto já tem mapa de investimento" };

  const map = await db.investmentMap.create({
    data: { tenantId: "", ...parsed.data },
  });

  revalidatePath("/cross-projects");
  return { success: true, data: { id: map.id } };
}

// ─── Investment Map: Update ────────────────────────────────

export async function updateInvestmentMap(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const id = formData.get("id") as string;
  if (!id) return { error: "ID obrigatório" };

  const raw: Record<string, unknown> = {};
  for (const key of ["totalBudget", "fundingSource", "fundingPercentage", "startDate", "endDate"]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const parsed = investmentMapUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  await db.investmentMap.update({ where: { id }, data: parsed.data });

  revalidatePath("/cross-projects");
  return { success: true };
}

// ─── Rubric: Create ────────────────────────────────────────

export async function createRubric(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    investmentMapId: formData.get("investmentMapId") as string,
    name: formData.get("name") as string,
    budgetAllocated: formData.get("budgetAllocated") as string,
    areaId: formData.get("areaId") as string || undefined,
    sortOrder: formData.get("sortOrder") as string || "0",
  };

  const parsed = investmentRubricCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  const rubric = await db.investmentRubric.create({
    data: { tenantId: "", ...parsed.data },
  });

  revalidatePath("/cross-projects");
  return { success: true, data: { id: rubric.id } };
}

// ─── Rubric: Update ────────────────────────────────────────

export async function updateRubric(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const id = formData.get("id") as string;
  if (!id) return { error: "ID obrigatório" };

  const raw: Record<string, unknown> = {};
  for (const key of ["name", "budgetAllocated", "budgetExecuted", "areaId", "sortOrder"]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const parsed = investmentRubricUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  await db.investmentRubric.update({ where: { id }, data: parsed.data });

  revalidatePath("/cross-projects");
  return { success: true };
}

// ─── Rubric: Delete (soft) ─────────────────────────────────

export async function deleteRubric(id: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  await db.investmentRubric.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/cross-projects");
  return { success: true };
}

// ─── Generate tasks from rubric ────────────────────────────

export async function generateTasksFromRubric(rubricId: string): Promise<ActionResult<{ taskCount: number }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const rubric = await db.investmentRubric.findFirst({
    where: { id: rubricId },
    include: { investmentMap: { select: { projectId: true } } },
  });
  if (!rubric) return { error: "Rubrica não encontrada" };

  // Create a task for the rubric
  await db.task.create({
    data: {
      tenantId: "",
      title: rubric.name,
      projectId: rubric.investmentMap.projectId,
      areaId: rubric.areaId,
      status: "backlog",
      priority: "media",
      origin: "investment_map",
      originRef: rubricId,
    },
  });

  revalidatePath("/cross-projects");
  revalidatePath("/");
  return { success: true, data: { taskCount: 1 } };
}
