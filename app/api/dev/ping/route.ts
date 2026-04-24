import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateDev } from "@/lib/dev-api-key";

export async function GET(request: NextRequest) {
  const ctx = await authenticateDev(request);
  if (ctx instanceof NextResponse) return ctx;

  return NextResponse.json({
    ok: true,
    keyId: ctx.keyId,
    tenantId: ctx.tenantId,
    scopes: ctx.scopes,
  });
}
