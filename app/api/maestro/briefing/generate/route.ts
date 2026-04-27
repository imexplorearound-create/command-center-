import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateBriefingCron } from "@/lib/auth/briefing-cron";
import { briefingTriggerSchema } from "@/lib/validation/briefing-schema";
import { resolveBriefingTargets } from "@/lib/maestro/briefing/scheduler";
import { runBriefingForUser, BRIEFING_STATUS } from "@/lib/maestro/briefing/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUN_CONCURRENCY = 6;

export async function POST(request: NextRequest) {
  const auth = authenticateBriefingCron(request);
  if (auth instanceof NextResponse) return auth;

  const rawBody = await request.json().catch(() => ({}));
  const parsed = briefingTriggerSchema.safeParse(rawBody ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const now = new Date();
  const targets = await resolveBriefingTargets({
    now,
    tenantIdFilter: parsed.data.tenantId,
    userIdFilter: parsed.data.userId,
    force: parsed.data.force,
  });

  let delivered = 0;
  let skippedEmpty = 0;
  let skippedExisting = 0;
  let failed = 0;
  const errors: { userId: string; error: string }[] = [];

  let cursor = 0;
  const data = parsed.data;
  async function worker() {
    while (cursor < targets.length) {
      const target = targets[cursor++];
      const result = await runBriefingForUser(target.tenant, target.user, {
        force: data.force,
        now,
      });
      if (result.status === BRIEFING_STATUS.DELIVERED) delivered += 1;
      else if (result.status === BRIEFING_STATUS.SKIPPED_EMPTY) skippedEmpty += 1;
      else if (result.status === BRIEFING_STATUS.SKIPPED_EXISTING) skippedExisting += 1;
      else if (result.status === BRIEFING_STATUS.FAILED) {
        failed += 1;
        errors.push({ userId: target.user.id, error: result.error ?? "unknown" });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(RUN_CONCURRENCY, targets.length) }, worker),
  );

  return NextResponse.json({
    processed: targets.length,
    delivered,
    skippedEmpty,
    skippedExisting,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
