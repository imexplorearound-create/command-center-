import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateBriefingCron } from "@/lib/auth/briefing-cron";
import { briefingTriggerSchema } from "@/lib/validation/briefing-schema";
import { resolveBriefingTargets } from "@/lib/maestro/briefing/scheduler";
import { runBriefingForUser } from "@/lib/maestro/briefing/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = authenticateBriefingCron(request);
  if (auth instanceof NextResponse) return auth;

  let parsedBody: unknown = {};
  if (request.headers.get("content-length") !== "0") {
    try {
      parsedBody = await request.json();
    } catch {
      parsedBody = {};
    }
  }

  const parsed = briefingTriggerSchema.safeParse(parsedBody ?? {});
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

  let processed = 0;
  let delivered = 0;
  let skippedEmpty = 0;
  let skippedExisting = 0;
  let failed = 0;
  const errors: { userId: string; error: string }[] = [];

  for (const target of targets) {
    processed += 1;
    const result = await runBriefingForUser(target.tenant, target.user, {
      force: parsed.data.force,
      now,
    });
    if (result.status === "delivered") delivered += 1;
    else if (result.status === "skipped_empty") skippedEmpty += 1;
    else if (result.status === "skipped_existing") skippedExisting += 1;
    else if (result.status === "failed") {
      failed += 1;
      errors.push({ userId: target.user.id, error: result.error ?? "unknown" });
    }
  }

  return NextResponse.json({
    processed,
    delivered,
    skippedEmpty,
    skippedExisting,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
