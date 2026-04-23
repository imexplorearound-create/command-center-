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

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.scriptPath !== undefined) data.scriptPath = body.scriptPath;
  if (body.videoPath !== undefined) data.videoPath = body.videoPath;
  if (body.platform !== undefined) data.platform = body.platform;
  if (body.publishedAt !== undefined) data.publishedAt = new Date(body.publishedAt);

  try {
    const updated = await db.contentItem.update({
      where: { id },
      data,
      select: { id: true, title: true, status: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }
    throw e;
  }
}
