import type { TenantPrisma } from "@/lib/db";

/**
 * Shared helpers for agent API routes.
 * Avoids duplicating slug/name resolution across every endpoint.
 *
 * All functions require a tenant-scoped Prisma client (`db`) to ensure
 * proper tenant isolation — never use `basePrisma` for business queries.
 */

export async function resolveProjectSlug(
  db: TenantPrisma,
  slug: string
): Promise<{ projectId: string; clientId: string | null } | null> {
  const project = await db.project.findFirst({
    where: { slug },
    select: { id: true, client: { select: { id: true } } },
  });
  if (!project) return null;
  return { projectId: project.id, clientId: project.client?.id ?? null };
}

export async function resolvePersonByName(
  db: TenantPrisma,
  name: string
): Promise<string | null> {
  const person = await db.person.findFirst({
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
  db: TenantPrisma,
  names: string[]
): Promise<string[]> {
  if (names.length === 0) return [];
  const conditions = names.flatMap((n) => [
    { name: { contains: n, mode: "insensitive" as const } },
    { email: { contains: n, mode: "insensitive" as const } },
  ]);
  const people = await db.person.findMany({
    where: { OR: conditions },
    select: { id: true },
  });
  return people.map((p) => p.id);
}

export function toDateStr(d: Date | null | undefined): string {
  return d ? d.toISOString().split("T")[0] : "";
}

export interface ResolvedTask {
  id: string;
  title: string;
  description: string | null;
  projectSlug: string | null;
}

export type TaskResolution =
  | { kind: "found"; task: ResolvedTask }
  | { kind: "not_found" }
  | { kind: "ambiguous"; matches: { id: string; title: string }[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve uma tarefa por UUID exacto ou pesquisa fuzzy no título.
 * Discriminated union evita sentinels ambíguos; `matches` devolve candidatos
 * para o Maestro poder sugerir "quiseste dizer X ou Y?".
 */
export async function resolveTaskByIdOrTitle(
  db: TenantPrisma,
  idOrTitle: string
): Promise<TaskResolution> {
  const select = {
    id: true,
    title: true,
    description: true,
    archivedAt: true,
    project: { select: { slug: true } },
  } as const;

  if (UUID_RE.test(idOrTitle)) {
    const t = await db.task.findUnique({ where: { id: idOrTitle }, select });
    if (!t || t.archivedAt) return { kind: "not_found" };
    return {
      kind: "found",
      task: { id: t.id, title: t.title, description: t.description, projectSlug: t.project?.slug ?? null },
    };
  }

  const matches = await db.task.findMany({
    where: { title: { contains: idOrTitle, mode: "insensitive" }, archivedAt: null },
    select,
    take: 5,
  });
  if (matches.length === 0) return { kind: "not_found" };
  if (matches.length > 1) {
    return { kind: "ambiguous", matches: matches.map((m) => ({ id: m.id, title: m.title })) };
  }
  const t = matches[0]!;
  return {
    kind: "found",
    task: { id: t.id, title: t.title, description: t.description, projectSlug: t.project?.slug ?? null },
  };
}
