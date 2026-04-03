import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateAgent } from "@/lib/agent-auth";

/**
 * POST /api/agent/interactions — Agent creates an interaction
 *
 * Body: { title, type, body?, projectSlug?, participants?, date? }
 *
 * Types: call, email, decisao, documento, tarefa, nota
 */

export async function POST(request: NextRequest) {
  const auth = authenticateAgent(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { title, type, body: interactionBody, projectSlug, participants, date } = body;

  if (!title || !type) {
    return NextResponse.json(
      { error: "title and type are required" },
      { status: 400 }
    );
  }

  let projectId: string | null = null;
  let clientId: string | null = null;

  if (projectSlug) {
    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, client: { select: { id: true } } },
    });
    projectId = project?.id ?? null;
    clientId = project?.client?.id ?? null;
  }

  // Resolve participants by name/email
  const participantIds: string[] = [];
  if (participants && Array.isArray(participants)) {
    for (const p of participants) {
      const person = await prisma.person.findFirst({
        where: {
          OR: [
            { name: { contains: p, mode: "insensitive" } },
            { email: { contains: p, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      if (person) participantIds.push(person.id);
    }
  }

  const interaction = await prisma.interaction.create({
    data: {
      type,
      title,
      body: interactionBody,
      source: `agent:${auth.agentId}`,
      projectId,
      clientId,
      participants: participantIds,
      interactionDate: date ? new Date(date) : new Date(),
    },
  });

  // Update client lastInteractionAt
  if (clientId) {
    await prisma.client.update({
      where: { id: clientId },
      data: { lastInteractionAt: new Date(), daysSinceContact: 0 },
    });
  }

  return NextResponse.json({ id: interaction.id }, { status: 201 });
}
