import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateAgent } from "@/lib/agent-auth";
import { resolveProjectSlug, toDateStr } from "@/lib/agent-helpers";

export async function GET(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const status = request.nextUrl.searchParams.get("status");

  const items = await prisma.contentItem.findMany({
    where: status ? { status } : undefined,
    include: {
      project: { select: { name: true, slug: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    count: items.length,
    items: items.map((c) => ({
      id: c.id,
      title: c.title,
      format: c.format,
      status: c.status,
      project: c.project?.slug,
      sourceCallDate: toDateStr(c.sourceCallDate),
      platform: c.platform,
      approvedBy: c.approvedBy?.name,
      scriptPath: c.scriptPath,
      videoPath: c.videoPath,
      publishedAt: c.publishedAt?.toISOString(),
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { title, format, status, projectSlug, sourceCallDate, platform, scriptPath, videoPath } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const resolved = projectSlug ? await resolveProjectSlug(projectSlug) : null;

  const item = await prisma.contentItem.create({
    data: {
      title,
      format,
      status: status ?? "proposta",
      projectId: resolved?.projectId ?? null,
      sourceCallDate: sourceCallDate ? new Date(sourceCallDate) : undefined,
      platform,
      scriptPath,
      videoPath,
      aiExtracted: true,
      aiConfidence: 0.8,
      validationStatus: "por_confirmar",
    },
  });

  return NextResponse.json({ id: item.id, title: item.title }, { status: 201 });
}
