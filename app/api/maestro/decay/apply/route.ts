import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateDecayCron } from "@/lib/auth/decay-cron";
import { decayInputSchema } from "@/lib/validation/decay-schema";
import { runDecay } from "@/lib/maestro/decay/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
