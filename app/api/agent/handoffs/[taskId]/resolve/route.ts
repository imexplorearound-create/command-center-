import type { NextRequest } from "next/server";
import { z } from "zod";
import { handleHandoffTransition } from "@/lib/handoff-route-helpers";
import { RESOLVABLE_FROM, HANDOFF_STATUS } from "@/lib/handoff-status";

const resolveSchema = z.object({
  commitSha: z.string().max(100).optional(),
  deployUrl: z.url().max(500).optional(),
  notes: z.string().max(5000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return handleHandoffTransition(request, params, {
    operation: "resolve",
    allowedFrom: RESOLVABLE_FROM,
    bodySchema: resolveSchema,
    buildData: (body) => ({
      handoffStatus: HANDOFF_STATUS.RESOLVED,
      handoffResolvedAt: new Date(),
      handoffResolution: body,
      status: "feito",
      completedAt: new Date(),
    }),
    buildResponse: ({ taskId }) => ({
      taskId,
      handoffStatus: HANDOFF_STATUS.RESOLVED,
      taskStatus: "feito",
    }),
  });
}
