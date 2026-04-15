"use server";

import { getTenantDb } from "@/lib/tenant";
import { requireWriter } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";
import {
  campaignCreateSchema,
  campaignUpdateSchema,
  templateCreateSchema,
  templateUpdateSchema,
} from "@/lib/validation/campaign-schema";
import { firstZodError } from "@/lib/validation/project-schema";
import type { ActionResult } from "./types";
import { field } from "./form-helpers";
import { buildAudienceFromFilter } from "@/lib/queries/campaign-queries";
import { getSmtpTransporter, markdownToBasicHtml, SMTP_FROM } from "@/lib/notifications/smtp";

// ─── Helpers ───────────────────────────────────────────────

function revalidateCampaignPaths() {
  revalidatePath("/crm/campaigns");
}

function interpolateVariables(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(`{{${k}}}`, v);
  }
  return result;
}

// ─── Campaign CRUD ─────────────────────────────────────────

export async function createCampaign(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw: Record<string, unknown> = {
    name: field(formData, "name") ?? "",
    subject: field(formData, "subject") ?? "",
    htmlContent: field(formData, "htmlContent") ?? "",
    templateId: field(formData, "templateId") || undefined,
    scheduledAt: field(formData, "scheduledAt") || undefined,
  };

  const filterStr = field(formData, "audienceFilter");
  if (filterStr) {
    try {
      raw.audienceFilter = JSON.parse(filterStr);
    } catch { /* ignore */ }
  }

  const parsed = campaignCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const db = await getTenantDb();

  const campaign = await db.emailCampaign.create({
    data: {
      tenantId: "",
      name: data.name,
      subject: data.subject,
      htmlContent: data.htmlContent,
      templateId: data.templateId ?? null,
      audienceFilter: data.audienceFilter ?? {},
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      status: data.scheduledAt ? "scheduled" : "draft",
      createdById: auth.user.personId,
    },
  });

  revalidateCampaignPaths();
  return { success: true, data: { id: campaign.id } };
}

export async function updateCampaign(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const id = field(formData, "id");
  if (!id) return { error: "ID da campanha obrigatório" };

  const raw: Record<string, unknown> = {};
  for (const key of ["name", "subject", "htmlContent", "templateId", "scheduledAt"] as const) {
    const v = field(formData, key);
    if (v !== undefined) raw[key] = v || undefined;
  }

  const filterStr = field(formData, "audienceFilter");
  if (filterStr) {
    try {
      raw.audienceFilter = JSON.parse(filterStr);
    } catch { /* ignore */ }
  }

  const parsed = campaignUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const db = await getTenantDb();

  const existing = await db.emailCampaign.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) return { error: "Campanha não encontrada" };
  if (existing.status !== "draft" && existing.status !== "scheduled") {
    return { error: "Só é possível editar campanhas em rascunho" };
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.subject !== undefined) updateData.subject = data.subject;
  if (data.htmlContent !== undefined) updateData.htmlContent = data.htmlContent;
  if (data.templateId !== undefined) updateData.templateId = data.templateId;
  if (data.audienceFilter !== undefined) updateData.audienceFilter = data.audienceFilter;
  if (data.scheduledAt !== undefined) {
    updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    updateData.status = data.scheduledAt ? "scheduled" : "draft";
  }

  await db.emailCampaign.update({ where: { id }, data: updateData });

  revalidateCampaignPaths();
  return { success: true, data: { id } };
}

export async function deleteCampaign(id: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const existing = await db.emailCampaign.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { error: "Campanha não encontrada" };

  await db.emailCampaign.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  revalidateCampaignPaths();
  return { success: true };
}

// ─── Send Campaign ─────────────────────────────────────────

export async function sendCampaign(id: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const transporter = getSmtpTransporter();
  if (!transporter) return { error: "SMTP não configurado" };

  const db = await getTenantDb();
  const campaign = await db.emailCampaign.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      subject: true,
      htmlContent: true,
      audienceFilter: true,
    },
  });
  if (!campaign) return { error: "Campanha não encontrada" };
  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return { error: "Campanha já enviada" };
  }

  const filter = (campaign.audienceFilter ?? {}) as Record<string, unknown>;
  const people = await buildAudienceFromFilter(filter);

  if (people.length === 0) {
    return { error: "Sem destinatários com email" };
  }

  // Mark as sending
  await db.emailCampaign.update({
    where: { id },
    data: { status: "sending" },
  });

  // Batch-create all recipients upfront
  const recipientData = people.map((p) => ({
    tenantId: "",
    campaignId: id,
    personId: p.id,
    email: p.email!,
    status: "pending",
  }));

  await db.campaignRecipient.createMany({ data: recipientData });

  // Fetch created recipients to get their IDs
  const recipients = await db.campaignRecipient.findMany({
    where: { campaignId: id },
    select: { id: true, email: true, personId: true },
  });

  // Send emails and track results
  const sentIds: string[] = [];
  const bouncedIds: string[] = [];

  for (const recipient of recipients) {
    const person = people.find((p) => p.id === recipient.personId);
    const personalContent = interpolateVariables(campaign.htmlContent, {
      nome: person?.name ?? "",
      name: person?.name ?? "",
      email: recipient.email,
    });

    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: recipient.email,
        subject: campaign.subject,
        html: markdownToBasicHtml(personalContent),
        text: personalContent,
      });
      sentIds.push(recipient.id);
    } catch {
      bouncedIds.push(recipient.id);
    }

    // Rate limit: ~10 emails/sec
    if ((sentIds.length + bouncedIds.length) % 10 === 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Batch-update statuses
  const now = new Date();
  if (sentIds.length > 0) {
    await db.campaignRecipient.updateMany({
      where: { id: { in: sentIds } },
      data: { status: "sent", sentAt: now },
    });
  }
  if (bouncedIds.length > 0) {
    await db.campaignRecipient.updateMany({
      where: { id: { in: bouncedIds } },
      data: { status: "bounced" },
    });
  }

  await db.emailCampaign.update({
    where: { id },
    data: {
      status: "sent",
      sentAt: now,
      sentCount: sentIds.length,
      bounceCount: bouncedIds.length,
    },
  });

  revalidateCampaignPaths();
  return { success: true };
}

// ─── Template CRUD ─────────────────────────────────────────

export async function createTemplate(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const raw = {
    name: field(formData, "name") ?? "",
    subject: field(formData, "subject") ?? "",
    htmlContent: field(formData, "htmlContent") ?? "",
  };

  const parsed = templateCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const db = await getTenantDb();

  const template = await db.emailTemplate.create({
    data: {
      tenantId: "",
      name: data.name,
      subject: data.subject,
      htmlContent: data.htmlContent,
      variables: data.variables ?? [],
    },
  });

  revalidateCampaignPaths();
  return { success: true, data: { id: template.id } };
}

export async function updateTemplate(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const id = field(formData, "id");
  if (!id) return { error: "ID do template obrigatório" };

  const raw: Record<string, unknown> = {};
  for (const key of ["name", "subject", "htmlContent"] as const) {
    const v = field(formData, key);
    if (v !== undefined) raw[key] = v;
  }

  const parsed = templateUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const data = parsed.data;

  const db = await getTenantDb();

  const existing = await db.emailTemplate.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { error: "Template não encontrado" };

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.subject !== undefined) updateData.subject = data.subject;
  if (data.htmlContent !== undefined) updateData.htmlContent = data.htmlContent;

  await db.emailTemplate.update({ where: { id }, data: updateData });

  revalidateCampaignPaths();
  return { success: true, data: { id } };
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  const auth = await requireWriter();
  if (!auth.ok) return { error: auth.error };

  const db = await getTenantDb();
  const existing = await db.emailTemplate.findUnique({
    where: { id },
    select: { id: true, isSystem: true },
  });
  if (!existing) return { error: "Template não encontrado" };
  if (existing.isSystem) return { error: "Não é possível eliminar templates de sistema" };

  await db.emailTemplate.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  revalidateCampaignPaths();
  return { success: true };
}
