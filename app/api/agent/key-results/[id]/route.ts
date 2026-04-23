import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { authenticateAgent, resolveAgentTenant } from "@/lib/agent-auth";
import { updateKrProgress } from "@/lib/okr-actions";

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

  if (body.currentValue === undefined) {
    return NextResponse.json({ error: "currentValue is required" }, { status: 400 });
  }

  try {
    await updateKrProgress(id, body.currentValue);

    const kr = await db.keyResult.findFirst({
      where: { id },
      include: {
        objective: { select: { id: true, title: true, currentValue: true, targetValue: true } },
      },
    });

    return NextResponse.json({
      id,
      currentValue: body.currentValue,
      parentObjective: kr?.objective
        ? {
            id: kr.objective.id,
            title: kr.objective.title,
            computedProgress:
              Number(kr.objective.targetValue) > 0
                ? Math.round(
                    (Number(kr.objective.currentValue) / Number(kr.objective.targetValue)) * 100
                  )
                : 0,
          }
        : null,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Key Result not found" }, { status: 404 });
    }
    throw e;
  }
}
