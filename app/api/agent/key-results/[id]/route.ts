import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { authenticateAgent } from "@/lib/agent-auth";
import { updateKrProgress } from "@/lib/okr-actions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();

  if (body.currentValue === undefined) {
    return NextResponse.json({ error: "currentValue is required" }, { status: 400 });
  }

  try {
    await updateKrProgress(id, body.currentValue);

    const kr = await prisma.keyResult.findUnique({
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
