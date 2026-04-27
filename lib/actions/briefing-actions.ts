"use server";

import { revalidatePath } from "next/cache";
import { basePrisma } from "@/lib/db";
import { getTenantDb } from "@/lib/tenant";
import { requireWriter } from "@/lib/auth/dal";
import { runBriefingForUser } from "@/lib/maestro/briefing/runner";
import type { ActionResult } from "./types";

export async function markBriefingAsRead(
  briefingId: string,
): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const result = await db.maestroBriefing.updateMany({
    where: { id: briefingId, userId: auth.user.userId },
    data: { readAt: new Date() },
  });
  if (result.count === 0) return { error: "Briefing não encontrado" };

  revalidatePath("/maestro/briefings");
  revalidatePath("/(app)", "layout");
  return { success: true };
}

export async function triggerMyBriefing(): Promise<
  ActionResult<{ status: string; briefingId?: string; error?: string }>
> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const [tenant, userRecord] = await Promise.all([
    basePrisma.tenant.findUnique({
      where: { id: auth.user.tenantId },
      select: { id: true, name: true, locale: true, timezone: true },
    }),
    db.user.findUnique({
      where: { id: auth.user.userId },
      select: {
        id: true,
        role: true,
        email: true,
        telegramChatId: true,
        whatsappPhoneId: true,
        notificationPrefs: true,
        person: { select: { id: true, name: true } },
      },
    }),
  ]);
  if (!tenant) return { error: "Tenant não encontrado" };
  if (!userRecord) return { error: "User não encontrado" };

  const result = await runBriefingForUser(tenant, userRecord, { force: true });
  revalidatePath("/maestro/briefings");
  revalidatePath("/(app)", "layout");
  return {
    success: true,
    data: {
      status: result.status,
      briefingId: result.briefingId,
      error: result.error,
    },
  };
}
