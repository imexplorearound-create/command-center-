import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

/**
 * Agent API authentication.
 * Agents authenticate via Bearer token in the Authorization header.
 * The token is shared for now (AGENT_API_SECRET env var).
 * Future: per-agent API keys stored in the DB.
 */

export interface AgentContext {
  agentId: string;
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
