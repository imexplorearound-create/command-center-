import { z } from "zod";

export const notificationChannelEnum = z.enum([
  "email",
  "telegram",
  "whatsapp",
  "discord",
  "webhook",
]);

export const notificationTypeEnum = z.enum([
  "task_assigned",
  "task_overdue",
  "approval_request",
  "timeentry_reminder",
  "feedback_bug",
  "feedback_suggestion",
  "campaign_sent",
]);

export const notificationPrefsSchema = z.object({
  channels: z.array(notificationChannelEnum).default(["email"]),
  quietHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }).optional(),
  types: z.record(
    notificationTypeEnum,
    z.array(notificationChannelEnum)
  ).optional(),
});

export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;
