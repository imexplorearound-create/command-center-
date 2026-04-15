import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { resolveHeaderTenant } from "@/lib/tenant";
import type { TenantPrisma } from "@/lib/db";

export interface AgentContext {
  agentId: string;
}

/**
 * Resolve the tenant for an agent/sync request.
 * Uses X-Tenant-Id header, falling back to the default tenant.
 */
export async function resolveAgentTenant(request: NextRequest): Promise<TenantPrisma | NextResponse> {
  try {
    return await resolveHeaderTenant(request.headers.get("x-tenant-id"));
  } catch {
    return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
  }
}

export function authenticateAgent(
  request: NextRequest
): AgentContext | NextResponse {
  const secret = process.env.AGENT_API_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "AGENT_API_SECRET not configured" },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Authorization: Bearer <token>" },
      { status: 401 }
    );
  }

  const token = auth.slice(7);
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(secret);
  if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const agentId = request.headers.get("x-agent-id") ?? "unknown";

  return { agentId };
}
