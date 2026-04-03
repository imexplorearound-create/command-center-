import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  if (token !== secret) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Agent identifies itself via X-Agent-Id header
  const agentId = request.headers.get("x-agent-id") ?? "unknown";

  return { agentId };
}
