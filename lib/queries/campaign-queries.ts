import { getTenantDb } from "@/lib/tenant";
import type { AudienceFilter } from "@/lib/validation/campaign-schema";

export async function getCampaigns(filters?: { status?: string }) {
  const db = await getTenantDb();
  const where: Record<string, unknown> = { archivedAt: null };
  if (filters?.status) where.status = filters.status;

  return db.emailCampaign.findMany({
    where,
    include: {
      template: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { recipients: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getCampaignById(id: string) {
  const db = await getTenantDb();
  return db.emailCampaign.findUnique({
    where: { id },
    include: {
      template: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      recipients: {
        select: {
          id: true,
          email: true,
          status: true,
          sentAt: true,
          openedAt: true,
          person: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 200,
      },
    },
  });
}

export async function getEmailTemplates() {
  const db = await getTenantDb();
  return db.emailTemplate.findMany({
    where: { archivedAt: null },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

function buildAudienceWhere(filter: AudienceFilter) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    archivedAt: null,
    email: { not: null },
  };

  if (filter.personType) where.type = filter.personType;

  // Combine area + project filters into a single AND array
  const andConditions: unknown[] = [];

  if (filter.areaIds?.length) {
    andConditions.push({
      tasks: { some: { areaId: { in: filter.areaIds } } },
    });
  }

  if (filter.projectIds?.length) {
    andConditions.push({
      tasks: { some: { projectId: { in: filter.projectIds } } },
    });
  }

  if (filter.roles?.length) {
    where.user = { role: { in: filter.roles } };
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

export async function buildAudienceFromFilter(filter: AudienceFilter) {
  const db = await getTenantDb();
  return db.person.findMany({
    where: buildAudienceWhere(filter),
    select: { id: true, name: true, email: true },
    take: 5000,
  });
}

export async function getAudienceCount(filter: AudienceFilter) {
  const db = await getTenantDb();
  return db.person.count({ where: buildAudienceWhere(filter) });
}
