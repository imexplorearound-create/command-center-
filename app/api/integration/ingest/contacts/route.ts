import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateIntegration } from "../../auth";
import { ingestContactsBodySchema } from "@/lib/validation/ingest-schema";

/**
 * POST /api/integration/ingest/contacts
 *
 * Batch upsert Person records by email.
 * Body: { contacts: [{ name, email, companyName?, role?, type? }] }
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateIntegration(request);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json();
    const parsed = ingestContactsBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const start = Date.now();
    let created = 0;
    let updated = 0;

    for (const contact of parsed.data.contacts) {
      const existing = await db.person.findFirst({
        where: { email: { equals: contact.email, mode: "insensitive" } },
      });

      if (existing) {
        await db.person.update({
          where: { id: existing.id },
          data: {
            name: contact.name,
            ...(contact.role ? { role: contact.role } : {}),
            ...(contact.type ? { type: contact.type } : {}),
          },
        });
        updated++;
      } else {
        await db.person.create({
          data: {
            tenantId: "",
            name: contact.name,
            email: contact.email,
            role: contact.role ?? null,
            type: contact.type ?? "cliente",
          },
        });
        created++;
      }
    }

    await db.syncLog.create({
      data: {
        tenantId: "",
        source: "integration",
        action: "ingest-contacts",
        status: "success",
        itemsProcessed: created + updated,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json({ created, updated });
  } catch (error) {
    console.error("Ingest contacts error:", error);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
