import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveHeaderTenant } from "@/lib/tenant";

/**
 * Calendar sync endpoint.
 * Receives calendar event data from OpenClaw main agent or external sync.
 *
 * POST /api/sync/calendar
 * Body: { events: [{ title, date, participants, projectSlug?, type? }] }
 *
 * This creates Interaction records of type "call" for tracking.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Resolve tenant from header or default
  const db = await resolveHeaderTenant(request.headers.get("x-tenant-id"));

  try {
    const body = (await request.json()) as {
      events: Array<{
        title: string;
        date: string;
        participants?: string[];
        projectSlug?: string;
        type?: string;
        body?: string;
      }>;
    };

    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json(
        { error: "Missing events array" },
        { status: 400 }
      );
    }

    const start = Date.now();
    let created = 0;

    for (const event of body.events) {
      let projectId: string | null = null;
      let clientId: string | null = null;

      if (event.projectSlug) {
        const project = await db.project.findFirst({
          where: { slug: event.projectSlug },
          select: { id: true, client: { select: { id: true } } },
        });
        projectId = project?.id ?? null;
        clientId = project?.client?.id ?? null;
      }

      // Resolve participant person IDs
      const participantIds: string[] = [];
      if (event.participants) {
        for (const name of event.participants) {
          const person = await db.person.findFirst({
            where: {
              OR: [
                { name: { contains: name, mode: "insensitive" } },
                { email: { contains: name, mode: "insensitive" } },
              ],
            },
            select: { id: true },
          });
          if (person) participantIds.push(person.id);
        }
      }

      await db.interaction.create({
        data: {
          tenantId: "",
          type: event.type ?? "call",
          title: event.title.slice(0, 500),
          body: event.body,
          source: "google_calendar",
          projectId,
          clientId,
          participants: participantIds,
          interactionDate: new Date(event.date),
        },
      });
      created++;
    }

    await db.syncLog.create({
      data: {
        tenantId: "",
        source: "google_calendar",
        action: "sync",
        status: "success",
        itemsProcessed: created,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json({ created });
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
