import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import type { ZodSchema } from "zod";
import { authenticateAgent, resolveAgentTenant } from "@/lib/agent-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import type { HandoffStatus } from "@/lib/handoff-status";

interface TransitionConfig<TBody> {
  operation: "claim" | "resolve" | "reject";
  allowedFrom: ReadonlySet<HandoffStatus>;
  bodySchema?: ZodSchema<TBody>;
  buildData: (
    body: TBody,
    ctx: { agentId: string }
  ) => Prisma.TaskUpdateInput;
  buildResponse: (ctx: { taskId: string; agentId: string }) => Record<string, unknown>;
}

export async function handleHandoffTransition<TBody>(
  request: NextRequest,
  paramsPromise: Promise<{ taskId: string }>,
  cfg: TransitionConfig<TBody>
): Promise<NextResponse> {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const rl = checkRateLimit(`handoff:${cfg.operation}:${auth.agentId}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  const db = await resolveAgentTenant(request);
  if (db instanceof NextResponse) return db;

  const { taskId } = await paramsPromise;

  let body: TBody = {} as TBody;
  if (cfg.bodySchema) {
    let raw: unknown = {};
    try {
      raw = await request.json();
    } catch {
      // empty body may still be valid against the schema
    }
    const parsed = cfg.bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid body", details: parsed.error.issues },
        { status: 400 }
      );
    }
    body = parsed.data;
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, handoffStatus: true },
  });
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }
  if (
    !task.handoffStatus ||
    !cfg.allowedFrom.has(task.handoffStatus as HandoffStatus)
  ) {
    return NextResponse.json(
      { error: `cannot ${cfg.operation} from status ${task.handoffStatus}` },
      { status: 409 }
    );
  }

  await db.task.update({
    where: { id: taskId },
    data: cfg.buildData(body, { agentId: auth.agentId }),
  });

  return NextResponse.json(cfg.buildResponse({ taskId, agentId: auth.agentId }));
}
