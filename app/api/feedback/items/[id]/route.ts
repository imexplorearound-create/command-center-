import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateAgent, resolveAgentTenant } from "@/lib/agent-auth";
import { updateFeedbackItemSchema } from "@/lib/validation/feedback-schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const db = await resolveAgentTenant(request);
  if (db instanceof NextResponse) return db;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateFeedbackItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const item = await db.feedbackItem.update({
    where: { id },
    data: {
      ...parsed.data,
      reviewedAt: parsed.data.status ? new Date() : undefined,
    },
  });

  return NextResponse.json({
    id: item.id,
    status: item.status,
    classification: item.classification,
    module: item.module,
    priority: item.priority,
  });
}
