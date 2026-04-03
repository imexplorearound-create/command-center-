import { prisma } from "@/lib/db";

/**
 * Shared helpers for agent API routes.
 * Avoids duplicating slug/name resolution across every endpoint.
 */

export async function resolveProjectSlug(
  slug: string
): Promise<{ projectId: string; clientId: string | null } | null> {
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, client: { select: { id: true } } },
  });
  if (!project) return null;
  return { projectId: project.id, clientId: project.client?.id ?? null };
}

export async function resolvePersonByName(
  name: string
): Promise<string | null> {
  const person = await prisma.person.findFirst({
    where: {
      OR: [
        { name: { contains: name, mode: "insensitive" } },
        { email: { contains: name, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return person?.id ?? null;
}

export async function resolvePersonsByNames(
  names: string[]
): Promise<string[]> {
  if (names.length === 0) return [];
  const conditions = names.flatMap((n) => [
    { name: { contains: n, mode: "insensitive" as const } },
    { email: { contains: n, mode: "insensitive" as const } },
  ]);
  const people = await prisma.person.findMany({
    where: { OR: conditions },
    select: { id: true },
  });
  return people.map((p) => p.id);
}

export function toDateStr(d: Date | null | undefined): string {
  return d ? d.toISOString().split("T")[0] : "";
}
