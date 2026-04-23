import type { NextRequest } from "next/server";
import { handleHandoffTransition } from "@/lib/handoff-route-helpers";
import { CLAIMABLE_FROM, HANDOFF_STATUS } from "@/lib/handoff-status";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return handleHandoffTransition(request, params, {
    operation: "claim",
    allowedFrom: CLAIMABLE_FROM,
    buildData: (_body, { agentId }) => ({
      handoffStatus: HANDOFF_STATUS.IN_PROGRESS,
      handoffAgentId: agentId,
      handoffClaimedAt: new Date(),
    }),
    buildResponse: ({ taskId, agentId }) => ({
      taskId,
      handoffStatus: HANDOFF_STATUS.IN_PROGRESS,
      agentId,
    }),
  });
}
