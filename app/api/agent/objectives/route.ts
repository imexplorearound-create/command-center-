import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateAgent } from "@/lib/agent-auth";

export async function GET(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const objectives = await prisma.objective.findMany({
    where: { status: "ativo" },
    include: {
      project: { select: { name: true, slug: true } },
      keyResults: {
        where: { status: "ativo" },
        orderBy: { krOrder: "asc" },
        select: {
          id: true,
          title: true,
          targetValue: true,
          currentValue: true,
          unit: true,
          weight: true,
          deadline: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    count: objectives.length,
    objectives: objectives.map((o) => ({
      id: o.id,
      title: o.title,
      project: o.project?.slug,
      targetValue: Number(o.targetValue),
      currentValue: Number(o.currentValue),
      unit: o.unit,
      deadline: o.deadline?.toISOString().split("T")[0],
      keyResults: o.keyResults.map((kr) => ({
        id: kr.id,
        title: kr.title,
        targetValue: Number(kr.targetValue),
        currentValue: Number(kr.currentValue),
        unit: kr.unit,
        weight: kr.weight,
        deadline: kr.deadline?.toISOString().split("T")[0],
      })),
    })),
  });
}
