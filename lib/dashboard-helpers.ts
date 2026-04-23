/**
 * Pure helpers for Dashboard v1 queries.
 *
 * Kept in a separate module so tests can import them without pulling in
 * `server-only` via lib/queries.ts → lib/tenant.ts.
 */

export const AUTONOMY_WINDOW_DAYS = 7;
export const FEED_DEFAULT_WINDOW_MINUTES = 90;

/** autonomy = aiTasks / totalTasks, rounded to whole %, clamped to [0, 100]. */
export function calcAutonomyPercent(aiTasks: number, totalTasks: number): number {
  if (totalTasks === 0) return 0;
  const ratio = aiTasks / totalTasks;
  return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
}

/** Classify a budget execution ratio into a passive-alert severity. */
export function classifyBudgetAlert(
  executed: number,
  allocated: number,
): "block" | "warn" | null {
  if (allocated <= 0) return null;
  const ratio = executed / allocated;
  if (ratio >= 1) return "block";
  if (ratio >= 0.9) return "warn";
  return null;
}

/** Map Alert.severity string to the 3-level passive-alert taxonomy.
 *  Accepts both the Alert schema default ("warning") and the legacy values. */
export function mapAlertSeverity(
  severity: string | null | undefined,
): "block" | "warn" | "pend" {
  if (severity === "high" || severity === "critical" || severity === "block") return "block";
  if (severity === "medium" || severity === "warn" || severity === "warning") return "warn";
  return "pend";
}

/** Dashboard v1 severity palette used by DecisionsColumn and AlertsPassive. */
export const SEVERITY_COLOR: Record<"block" | "warn" | "pend", string> = {
  block: "var(--error, #C0392B)",
  warn: "var(--warning, #D4883A)",
  pend: "var(--accent, #B08A2C)",
};

/** Severity rank for sort order in decisions column (block > warn > pend). */
export const DECISION_SEVERITY_RANK: Record<string, number> = {
  block: 3,
  warn: 2,
  pend: 1,
};

/**
 * Human-friendly relative deadline label.
 *   - null date  → null
 *   - past       → "atrasado"
 *   - < 24h      → "em Nh"
 *   - >= 24h     → "em Nd"
 */
export function formatDeadline(
  d: Date | null | undefined,
  nowMs: number = Date.now(),
): string | null {
  if (!d) return null;
  const diffH = (d.getTime() - nowMs) / (60 * 60 * 1000);
  if (diffH < 0) return "atrasado";
  if (diffH < 24) return `em ${Math.round(diffH)}h`;
  return `em ${Math.round(diffH / 24)}d`;
}

/** Feedback session status palette used by /feedback (Portiqa tokens). */
export const FEEDBACK_STATUS_COLOR: Record<
  "processing" | "ready" | "reviewed" | "archived",
  string
> = {
  processing: "var(--warning, #D4883A)",
  ready: "var(--success, #2D8A5E)",
  reviewed: "var(--accent, #B08A2C)",
  archived: "var(--muted, #8A8778)",
};
