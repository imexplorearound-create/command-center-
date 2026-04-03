import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateAgent } from "@/lib/agent-auth";
import { resolveProjectSlug, resolvePersonsByNames } from "@/lib/agent-helpers";

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

  // Resolve project and participants in parallel
  const [resolved, participantIds] = await Promise.all([
    projectSlug ? resolveProjectSlug(projectSlug) : null,
    participants && Array.isArray(participants)
      ? resolvePersonsByNames(participants)
      : [],
  ]);

  const interaction = await prisma.interaction.create({
    data: {
      type,
      title,
      body: interactionBody,
      source: `agent:${auth.agentId}`,
      projectId: resolved?.projectId ?? null,
      clientId: resolved?.clientId ?? null,
      participants: participantIds,
      interactionDate: date ? new Date(date) : new Date(),
    },
  });

  // Update client lastInteractionAt
  if (resolved?.clientId) {
    await prisma.client.update({
      where: { id: resolved.clientId },
      data: { lastInteractionAt: new Date(), daysSinceContact: 0 },
    });
  }

  return NextResponse.json({ id: interaction.id }, { status: 201 });
}
