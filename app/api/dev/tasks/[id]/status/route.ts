import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateDev } from "@/lib/dev-api-key";
import { tenantPrisma } from "@/lib/db";
import { parseJsonBody } from "@/lib/api/dev-route-helpers";
import { devTaskTransitionSchema } from "@/lib/validation/dev-task-status-schema";
import { applyDevTransition } from "@/lib/actions/task-dev-transitions";
import { defer } from "@/lib/utils/defer";
import { notifyReadyForVerification } from "@/lib/notifications/feedback-ready-for-verification-notifier";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await authenticateDev(request, { scopes: ["tasks:write"] });
  if (ctx instanceof NextResponse) return ctx;

  const body = await parseJsonBody(request, devTaskTransitionSchema);
  if (body instanceof NextResponse) return body;

  const { id } = await params;
  const db = tenantPrisma(ctx.tenantId);

  const result = await applyDevTransition(db, id, body.status, {
    rejectionReason: body.rejectionReason,
    rejectionOrigin: "dev",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (body.status === "ready_for_verification") {
    defer("notify-verification", async () => {
      await notifyReadyForVerification(db, id);
    });
  }

  return NextResponse.json({
    ok: true,
    status: result.newStatus,
    affected: result.affected,
  });
}
