import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateAgent } from "@/lib/agent-auth";

/**
 * GET /api/agent/content — Agent gets content pipeline
 *
 * Query params:
 *   status — filter (proposta, aprovado, em_producao, pronto, publicado)
 *
 * POST /api/agent/content — Agent creates content item
 *
 * Body: { title, format?, status?, projectSlug?, sourceCallDate?, platform? }
 */

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
      sourceCallDate: c.sourceCallDate?.toISOString().split("T")[0],
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

  let projectId: string | null = null;
  if (projectSlug) {
    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true },
    });
    projectId = project?.id ?? null;
  }

  const item = await prisma.contentItem.create({
    data: {
      title,
      format,
      status: status ?? "proposta",
      projectId,
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
