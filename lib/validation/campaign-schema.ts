import { z } from "zod";

// ─── Campaign Status ───────────────────────────────────────

export const campaignStatusEnum = z.enum([
  "draft",
  "scheduled",
  "sending",
  "sent",
  "archived",
]);
export type CampaignStatus = z.infer<typeof campaignStatusEnum>;

export const CAMPAIGN_STATUS_OPTIONS = campaignStatusEnum.options;

// ─── Audience Filter ───────────────────────────────────────

export const audienceFilterSchema = z.object({
  roles: z.array(z.string()).optional(),
  areaIds: z.array(z.string()).optional(),
  projectIds: z.array(z.string()).optional(),
  personType: z.string().optional(),
});
export type AudienceFilter = z.infer<typeof audienceFilterSchema>;

// ─── Campaign Schemas ──────────────────────────────────────

export const campaignCreateSchema = z.object({
  name: z.string().min(1).max(300),
  subject: z.string().min(1).max(500),
  htmlContent: z.string().min(1),
  templateId: z.string().uuid().optional(),
  audienceFilter: audienceFilterSchema.optional(),
  scheduledAt: z.string().optional(),
});

export const campaignUpdateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  subject: z.string().min(1).max(500).optional(),
  htmlContent: z.string().min(1).optional(),
  templateId: z.string().uuid().nullable().optional(),
  audienceFilter: audienceFilterSchema.optional(),
  scheduledAt: z.string().nullable().optional(),
});

// ─── Template Schemas ──────────────────────────────────────

export const templateCreateSchema = z.object({
  name: z.string().min(1).max(300),
  subject: z.string().min(1).max(500),
  htmlContent: z.string().min(1),
  variables: z.array(z.string()).optional(),
});

export const templateUpdateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  subject: z.string().min(1).max(500).optional(),
  htmlContent: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
});
