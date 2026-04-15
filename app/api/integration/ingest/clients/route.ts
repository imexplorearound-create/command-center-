import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateIntegration } from "../../auth";
import { ingestClientsBodySchema } from "@/lib/validation/ingest-schema";

/**
 * POST /api/integration/ingest/clients
 *
 * Upserts Person records by email and optionally links them as ClientContacts.
 * Body: { clients: [{ name, email, companyName?, nif?, projectSlug? }] }
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateIntegration(request);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json();
    const parsed = ingestClientsBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const start = Date.now();
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const client of parsed.data.clients) {
      try {
        // Upsert Person by email
        let person;
        if (client.email) {
          person = await db.person.findFirst({
            where: { email: { equals: client.email, mode: "insensitive" } },
          });
        }

        if (person) {
          await db.person.update({
            where: { id: person.id },
            data: { name: client.name },
          });
          updated++;
        } else {
          person = await db.person.create({
            data: {
              tenantId: "",
              name: client.name,
              email: client.email ?? null,
              type: "cliente",
            },
          });
          created++;
        }

        // If projectSlug provided, resolve Project → Client and create ClientContact
        if (client.projectSlug) {
          const project = await db.project.findFirst({
            where: { slug: client.projectSlug },
            select: { id: true, client: { select: { id: true } } },
          });

          if (!project) {
            errors.push(`Project not found: ${client.projectSlug}`);
            continue;
          }

          if (!project.client) {
            // Create Client for this project
            const newClient = await db.client.create({
              data: {
                tenantId: "",
                companyName: client.companyName ?? client.name,
                projectId: project.id,
              },
            });

            await db.clientContact.create({
              data: {
                tenantId: "",
                clientId: newClient.id,
                personId: person.id,
                isPrimary: true,
              },
            });
          } else {
            // Check if contact already exists
            const existingContact = await db.clientContact.findFirst({
              where: { clientId: project.client.id, personId: person.id },
            });

            if (!existingContact) {
              await db.clientContact.create({
                data: {
                  tenantId: "",
                  clientId: project.client.id,
                  personId: person.id,
                },
              });
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed for ${client.email ?? client.name}: ${msg}`);
      }
    }

    await db.syncLog.create({
      data: {
        tenantId: "",
        source: "integration",
        action: "ingest-clients",
        status: errors.length > 0 ? "partial" : "success",
        itemsProcessed: created + updated,
        errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json({ created, updated, errors });
  } catch (error) {
    console.error("Ingest clients error:", error);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
