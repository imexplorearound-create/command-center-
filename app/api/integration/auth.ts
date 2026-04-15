import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { resolveHeaderTenant } from "@/lib/tenant";
import type { TenantPrisma } from "@/lib/db";

export async function authenticateIntegration(
  request: NextRequest
): Promise<{ db: TenantPrisma } | NextResponse> {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SYNC_SECRET not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization" }, { status: 401 });
  }

  const token = auth.slice(7);
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(secret);
  if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const db = await resolveHeaderTenant(request.headers.get("x-tenant-id"));
    return { db };
  } catch {
    return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
  }
}
