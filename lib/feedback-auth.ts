import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { getSecretKey } from "@/lib/auth/secret";
import { authenticateAgent } from "@/lib/agent-auth";
import { resolveTenantBySlug, DEFAULT_TENANT_SLUG } from "@/lib/tenant";

// Tokens de feedback são assinados com a mesma key do cookie de sessão da
// dashboard, mas trazem `type: "feedback"` para impedir cross-use entre
// ambos os fluxos (um cookie de admin não autentica voice notes e vice-versa).

const FEEDBACK_TOKEN_TYPE = "feedback";
const FEEDBACK_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const feedbackTokenPayloadSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  tenantId: z.string(),
  type: z.literal(FEEDBACK_TOKEN_TYPE),
});

export type FeedbackTokenPayload = Omit<
  z.infer<typeof feedbackTokenPayloadSchema>,
  "type"
>;

export type FeedbackOrAgentContext =
  | { via: "feedback"; userId: string; email: string; name: string; tenantId: string }
  | { via: "agent"; agentId: string; tenantId: string };

export async function signFeedbackToken(payload: FeedbackTokenPayload): Promise<{
  token: string;
  expiresAt: number;
}> {
  const expiresAt = Date.now() + FEEDBACK_TOKEN_TTL_SECONDS * 1000;
  const token = await new SignJWT({ ...payload, type: FEEDBACK_TOKEN_TYPE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${FEEDBACK_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
  return { token, expiresAt };
}

export async function authenticateFeedbackUser(
  request: NextRequest
): Promise<{ via: "feedback"; userId: string; email: string; name: string; tenantId: string } | NextResponse> {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Authorization: Bearer <token>" },
      { status: 401 }
    );
  }

  const token = auth.slice(7);
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const parsed = feedbackTokenPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return {
      via: "feedback",
      userId: parsed.data.userId,
      email: parsed.data.email,
      name: parsed.data.name,
      tenantId: parsed.data.tenantId,
    };
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}

export async function authenticateFeedbackOrAgent(
  request: NextRequest
): Promise<FeedbackOrAgentContext | NextResponse> {
  const feedback = await authenticateFeedbackUser(request);
  if (!(feedback instanceof NextResponse)) return feedback;

  const agent = authenticateAgent(request);
  if (agent instanceof NextResponse) {
    return feedback;
  }
  // Resolve tenantId from header, fallback to default tenant
  let tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    const tenant = await resolveTenantBySlug(DEFAULT_TENANT_SLUG);
    tenantId = tenant?.id ?? "";
  }
  return { via: "agent", agentId: agent.agentId, tenantId };
}
