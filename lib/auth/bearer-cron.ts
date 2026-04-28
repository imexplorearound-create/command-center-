import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Verifica o Bearer de um endpoint sistémico (cron). O secret vive numa
 * env var passada via `envVarName`. Se a env var não estiver definida, o
 * endpoint **rejeita sempre** (503) — não há "modo dev permissivo", para
 * evitar que ambientes mal configurados aceitem requests anónimos.
 */
export function authenticateBearer(
  req: NextRequest,
  envVarName: string,
): { ok: true } | NextResponse {
  const secret = process.env[envVarName];
  if (!secret) {
    return NextResponse.json(
      { error: `${envVarName} not configured` },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { ok: true };
}
