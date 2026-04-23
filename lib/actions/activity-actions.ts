"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireWriter } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { activityCreateSchema } from "@/lib/validation/opportunity-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import type { ActionResult } from "./types";

// ─── Create ─────────────────────────────────────────────────

export async function createActivity(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    opportunityId: formData.get("opportunityId") as string,
    type: formData.get("type") as string,
    title: formData.get("title") as string,
    description: formData.get("description") as string || undefined,
    scheduledAt: formData.get("scheduledAt") as string || undefined,
  };

  const parsed = activityCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  const activity = await db.opportunityActivity.create({
    data: {
      tenantId: "",
      ...parsed.data,
      createdById: auth.user.personId,
    },
  });

  revalidatePath(`/crm/${parsed.data.opportunityId}`);
  return { success: true, data: { id: activity.id } };
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteActivity(id: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const activity = await db.opportunityActivity.findFirst({ where: { id } });
  if (!activity) return { error: "Actividade não encontrada" };

  await db.opportunityActivity.delete({ where: { id } });

  revalidatePath(`/crm/${activity.opportunityId}`);
  return { success: true };
}
