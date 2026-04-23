export const HANDOFF_STATUS = {
  QUEUED: "queued",
  DELIVERED: "delivered",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  REJECTED: "rejected",
} as const;

export type HandoffStatus = (typeof HANDOFF_STATUS)[keyof typeof HANDOFF_STATUS];

export const HANDOFF_STATUS_VALUES = new Set<string>(Object.values(HANDOFF_STATUS));

export const CLAIMABLE_FROM: ReadonlySet<HandoffStatus> = new Set([
  HANDOFF_STATUS.QUEUED,
  HANDOFF_STATUS.DELIVERED,
]);

export const RESOLVABLE_FROM: ReadonlySet<HandoffStatus> = new Set([
  HANDOFF_STATUS.QUEUED,
  HANDOFF_STATUS.DELIVERED,
  HANDOFF_STATUS.IN_PROGRESS,
]);

export const REJECTABLE_FROM: ReadonlySet<HandoffStatus> = new Set([
  HANDOFF_STATUS.QUEUED,
  HANDOFF_STATUS.DELIVERED,
  HANDOFF_STATUS.IN_PROGRESS,
]);
