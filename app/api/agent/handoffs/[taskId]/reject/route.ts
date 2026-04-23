import type { NextRequest } from "next/server";
import { z } from "zod";
import { handleHandoffTransition } from "@/lib/handoff-route-helpers";
import { REJECTABLE_FROM, HANDOFF_STATUS } from "@/lib/handoff-status";

const rejectSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return handleHandoffTransition(request, params, {
    operation: "reject",
    allowedFrom: REJECTABLE_FROM,
    bodySchema: rejectSchema,
    buildData: (body) => ({
      handoffStatus: HANDOFF_STATUS.REJECTED,
      handoffResolvedAt: new Date(),
      handoffResolution: { reason: body.reason },
    }),
    buildResponse: ({ taskId }) => ({
      taskId,
      handoffStatus: HANDOFF_STATUS.REJECTED,
    }),
  });
}
