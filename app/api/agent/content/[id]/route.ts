import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateAgent } from "@/lib/agent-auth";

/**
 * PATCH /api/agent/content/:id — Agent updates content status
 *
 * Body: { status?, scriptPath?, videoPath?, platform?, publishedAt? }
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();

  const item = await prisma.contentItem.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.scriptPath) data.scriptPath = body.scriptPath;
  if (body.videoPath) data.videoPath = body.videoPath;
  if (body.platform) data.platform = body.platform;
  if (body.publishedAt) data.publishedAt = new Date(body.publishedAt);

  const updated = await prisma.contentItem.update({
    where: { id },
    data,
    select: { id: true, title: true, status: true },
  });

  return NextResponse.json(updated);
}
