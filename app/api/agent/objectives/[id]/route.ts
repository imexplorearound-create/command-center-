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
    await prisma.objective.update({
      where: { id },
      data: { currentValue: body.currentValue },
    });
    return NextResponse.json({ id, currentValue: body.currentValue });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Objective not found" }, { status: 404 });
    }
    throw e;
  }
}
