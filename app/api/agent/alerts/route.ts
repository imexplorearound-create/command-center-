import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateAgent } from "@/lib/agent-auth";

/**
 * POST /api/agent/alerts — Agent creates an alert
 *
 * Body: { title, type?, severity?, description?, projectSlug? }
 */

export async function POST(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { title, type, severity, description, projectSlug } = body;

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

  const alert = await prisma.alert.create({
    data: {
      title,
      type: type ?? `agent:${auth.agentId}`,
      severity: severity ?? "info",
      description: description ?? `Criado por agente ${auth.agentId}`,
      relatedProjectId: projectId,
    },
  });

  return NextResponse.json({ id: alert.id }, { status: 201 });
}
