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
