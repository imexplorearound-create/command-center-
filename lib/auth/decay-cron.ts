import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Verifica o Bearer do cron de decay. O secret vive em
 * `DECAY_CRON_SECRET` (.env.local). Se a env var não estiver definida,
 * o endpoint **rejeita sempre** — não há "modo dev permissivo".
 */
export function authenticateDecayCron(req: NextRequest):
  | { ok: true }
  | NextResponse {
  const secret = process.env.DECAY_CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "DECAY_CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { ok: true };
}
