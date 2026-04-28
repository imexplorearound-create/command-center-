import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateDecayCron } from "@/lib/auth/decay-cron";
import { runDecay } from "@/lib/maestro/decay/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const decayInputSchema = z.object({
  tenantId: z.string().uuid().optional(),
  dryRun: z.boolean().optional(),
  cooldownDays: z.number().int().min(1).max(365).optional(),
});

export async function POST(request: NextRequest) {
  const auth = authenticateDecayCron(request);
  if (auth instanceof NextResponse) return auth;

  const rawBody = await request.json().catch(() => ({}));
  const parsed = decayInputSchema.safeParse(rawBody ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await runDecay(parsed.data);

  return NextResponse.json({
    processed: result.processed,
    decayed: result.decayed,
    skippedZero: result.skippedZero,
    candidates: result.candidates,
    errors: result.errors.length > 0 ? result.errors : undefined,
  });
}
