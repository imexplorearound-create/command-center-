export type NotificationType =
  | "feedback_bug"
  | "feedback_suggestion"
  | "feedback_session_ready"
  | "feedback_approved"
  | "feedback_ready_for_verification"
  | "task_assigned"
  | "task_overdue"
  | "approval_request"
  | "timeentry_reminder"
  | "campaign_sent";

export interface NotificationPayload {
  type: NotificationType;
  recipientEmail?: string;
  subject: string;
  summary: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationChannel {
  type: string;
  enabled: boolean;
  send(payload: NotificationPayload): Promise<void>;
}
