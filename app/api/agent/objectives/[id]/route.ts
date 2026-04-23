import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { authenticateAgent, resolveAgentTenant } from "@/lib/agent-auth";

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
    await db.objective.update({
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
