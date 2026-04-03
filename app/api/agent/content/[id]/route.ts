import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { authenticateAgent } from "@/lib/agent-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.scriptPath) data.scriptPath = body.scriptPath;
  if (body.videoPath) data.videoPath = body.videoPath;
  if (body.platform) data.platform = body.platform;
  if (body.publishedAt) data.publishedAt = new Date(body.publishedAt);

  try {
    const updated = await prisma.contentItem.update({
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
