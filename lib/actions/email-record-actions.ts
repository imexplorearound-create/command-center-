"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireWriter } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import { emailCategorizationSchema } from "@/lib/validation/email-record-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import type { ActionResult } from "./types";

// ─── Categorize (manual) ───────────────────────────────────

export async function categorizeEmail(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    id: formData.get("id") as string,
    projectId: formData.get("projectId") as string || undefined,
    clientId: formData.get("clientId") as string || undefined,
    personId: formData.get("personId") as string || undefined,
    opportunityId: formData.get("opportunityId") as string || undefined,
  };

  const parsed = emailCategorizationSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const db = await getTenantDb();
  const record = await db.emailRecord.findFirst({ where: { id: parsed.data.id } });
  if (!record) return { error: "Email não encontrado" };

  // Create linked Interaction when categorized
  const interaction = await db.interaction.create({
    data: {
      tenantId: "",
      type: "email",
      title: record.subject,
      body: record.snippet,
      source: "gmail",
      sourceRef: `gmail:${record.gmailId}`,
      projectId: parsed.data.projectId,
      clientId: parsed.data.clientId,
      participants: parsed.data.personId ? [parsed.data.personId] : [],
      interactionDate: record.receivedAt,
    },
  });

  await db.emailRecord.update({
    where: { id: parsed.data.id },
    data: {
      projectId: parsed.data.projectId,
      clientId: parsed.data.clientId,
      personId: parsed.data.personId,
      opportunityId: parsed.data.opportunityId,
      categorizationMethod: "manual",
      validationStatus: "confirmado",
      isProcessed: true,
      interactionId: interaction.id,
    },
  });

  revalidatePath("/email-sync");
  revalidatePath("/");
  return { success: true };
}

// ─── Reject categorization ─────────────────────────────────

export async function rejectEmailCategorization(id: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  await db.emailRecord.update({
    where: { id },
    data: { validationStatus: "rejeitado", isProcessed: true },
  });

  revalidatePath("/email-sync");
  return { success: true };
}

// ─── Bulk categorize ───────────────────────────────────────

export async function bulkCategorize(
  ids: string[],
  projectId: string | null,
  clientId: string | null
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();

  const records = await db.emailRecord.findMany({
    where: { id: { in: ids } },
  });

  await db.$transaction(async (tx) => {
    for (const record of records) {
      const interaction = await tx.interaction.create({
        data: {
          tenantId: "",
          type: "email",
          title: record.subject,
          body: record.snippet,
          source: "gmail",
          sourceRef: `gmail:${record.gmailId}`,
          projectId,
          clientId,
          participants: record.personId ? [record.personId] : [],
          interactionDate: record.receivedAt,
        },
      });

      await tx.emailRecord.update({
        where: { id: record.id },
        data: {
          projectId,
          clientId,
          categorizationMethod: "manual",
          validationStatus: "confirmado",
          isProcessed: true,
          interactionId: interaction.id,
        },
      });
    }
  });

  revalidatePath("/email-sync");
  return { success: true };
}
