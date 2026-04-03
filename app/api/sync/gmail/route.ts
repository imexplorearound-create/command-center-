import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Gmail sync endpoint.
 * Receives email interaction data from OpenClaw or external sync.
 *
 * POST /api/sync/gmail
 * Body: { emails: [{ subject, from, to, date, body?, projectSlug? }] }
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = (await request.json()) as {
      emails: Array<{
        subject: string;
        from: string;
        to: string[];
        date: string;
        body?: string;
        projectSlug?: string;
        messageId?: string;
      }>;
    };

    if (!body.emails || !Array.isArray(body.emails)) {
      return NextResponse.json(
        { error: "Missing emails array" },
        { status: 400 }
      );
    }

    const start = Date.now();
    let created = 0;

    for (const email of body.emails) {
      // Skip duplicates by sourceRef
      if (email.messageId) {
        const existing = await prisma.interaction.findFirst({
          where: { sourceRef: `gmail:${email.messageId}` },
        });
        if (existing) continue;
      }

      let projectId: string | null = null;
      let clientId: string | null = null;

      if (email.projectSlug) {
        const project = await prisma.project.findUnique({
          where: { slug: email.projectSlug },
          select: { id: true, client: { select: { id: true } } },
        });
        projectId = project?.id ?? null;
        clientId = project?.client?.id ?? null;
      }

      // Resolve participants from email addresses
      const allAddresses = [email.from, ...(email.to ?? [])];
      const participantIds: string[] = [];
      for (const addr of allAddresses) {
        const person = await prisma.person.findFirst({
          where: { email: { equals: addr, mode: "insensitive" } },
          select: { id: true },
        });
        if (person) participantIds.push(person.id);
      }

      // Try to auto-detect project from participant emails
      if (!projectId && participantIds.length > 0) {
        const contact = await prisma.clientContact.findFirst({
          where: { personId: { in: participantIds } },
          select: { client: { select: { id: true, projectId: true } } },
        });
        if (contact) {
          projectId = contact.client.projectId;
          clientId = contact.client.id;
        }
      }

      await prisma.interaction.create({
        data: {
          type: "email",
          title: email.subject.slice(0, 500),
          body: email.body?.slice(0, 5000),
          source: "gmail",
          sourceRef: email.messageId ? `gmail:${email.messageId}` : undefined,
          projectId,
          clientId,
          participants: participantIds,
          interactionDate: new Date(email.date),
        },
      });
      created++;
    }

    // Update client lastInteractionAt
    if (created > 0) {
      const clients = await prisma.client.findMany({
        select: { id: true, projectId: true },
      });
      for (const client of clients) {
        const latest = await prisma.interaction.findFirst({
          where: { clientId: client.id },
          orderBy: { interactionDate: "desc" },
          select: { interactionDate: true },
        });
        if (latest) {
          const daysSince = Math.floor(
            (Date.now() - latest.interactionDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          await prisma.client.update({
            where: { id: client.id },
            data: {
              lastInteractionAt: latest.interactionDate,
              daysSinceContact: daysSince,
            },
          });
        }
      }
    }

    await prisma.syncLog.create({
      data: {
        source: "gmail",
        action: "sync",
        status: "success",
        itemsProcessed: created,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json({ created });
  } catch (error) {
    console.error("Gmail sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
