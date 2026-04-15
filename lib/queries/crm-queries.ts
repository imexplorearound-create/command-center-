import "server-only";
import { getTenantDb } from "@/lib/tenant";
import type { OpportunityData, OpportunityDetailData } from "@/lib/types";

export async function getOpportunities(filters?: {
  ownerId?: string;
  source?: string;
}): Promise<OpportunityData[]> {
  const db = await getTenantDb();
  const where: Record<string, unknown> = { archivedAt: null };
  if (filters?.ownerId) where.ownerId = filters.ownerId;
  if (filters?.source) where.source = filters.source;

  const opps = await db.opportunity.findMany({
    where,
    include: {
      contact: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, avatarColor: true } },
    },
    orderBy: [{ stageId: "asc" }, { kanbanOrder: "asc" }],
  });

  const now = Date.now();
  return opps.map((o) => ({
    id: o.id,
    title: o.title,
    stageId: o.stageId as OpportunityData["stageId"],
    kanbanOrder: o.kanbanOrder,
    value: o.value ? Number(o.value) : null,
    currency: o.currency,
    probability: o.probability,
    contactId: o.contactId,
    contactName: o.contact?.name ?? null,
    ownerId: o.ownerId,
    ownerName: o.owner?.name ?? null,
    ownerColor: o.owner?.avatarColor ?? "#6366f1",
    companyName: o.companyName,
    companyNif: o.companyNif,
    expectedClose: o.expectedClose?.toISOString().slice(0, 10) ?? null,
    source: o.source,
    daysInStage: Math.floor((now - o.stageEnteredAt.getTime()) / 86400000),
    createdAt: o.createdAt.toISOString(),
  }));
}

export async function getOpportunityById(id: string): Promise<OpportunityDetailData | null> {
  const db = await getTenantDb();
  const o = await db.opportunity.findFirst({
    where: { id, archivedAt: null },
    include: {
      contact: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, avatarColor: true } },
      activities: {
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!o) return null;

  const now = Date.now();
  return {
    id: o.id,
    title: o.title,
    stageId: o.stageId as OpportunityData["stageId"],
    kanbanOrder: o.kanbanOrder,
    value: o.value ? Number(o.value) : null,
    currency: o.currency,
    probability: o.probability,
    contactId: o.contactId,
    contactName: o.contact?.name ?? null,
    ownerId: o.ownerId,
    ownerName: o.owner?.name ?? null,
    ownerColor: o.owner?.avatarColor ?? "#6366f1",
    companyName: o.companyName,
    companyNif: o.companyNif,
    expectedClose: o.expectedClose?.toISOString().slice(0, 10) ?? null,
    source: o.source,
    daysInStage: Math.floor((now - o.stageEnteredAt.getTime()) / 86400000),
    createdAt: o.createdAt.toISOString(),
    closedAt: o.closedAt?.toISOString() ?? null,
    convertedProjectId: o.convertedProjectId,
    activities: o.activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      scheduledAt: a.scheduledAt?.toISOString() ?? null,
      completedAt: a.completedAt?.toISOString() ?? null,
      createdByName: a.createdBy?.name ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export function computePipelineStats(opps: OpportunityData[]) {
  const byStage: Record<string, { count: number; value: number }> = {};
  let totalValue = 0;

  for (const o of opps) {
    const stage = o.stageId;
    if (!byStage[stage]) byStage[stage] = { count: 0, value: 0 };
    byStage[stage].count++;
    const val = o.value ?? 0;
    byStage[stage].value += val;
    totalValue += val;
  }

  const totalClosed = (byStage["ganho"]?.count ?? 0) + (byStage["perdido"]?.count ?? 0);
  const totalWon = byStage["ganho"]?.count ?? 0;

  return {
    totalDeals: opps.length,
    totalValue,
    byStage,
    conversionRate: totalClosed > 0 ? Math.round((totalWon / totalClosed) * 100) : 0,
  };
}

export async function getCrmPipelineStats() {
  const opps = await getOpportunities();
  return computePipelineStats(opps);
}

export async function getCrmOptions() {
  const db = await getTenantDb();
  const people = await db.person.findMany({
    where: { archivedAt: null },
    select: { id: true, name: true, avatarColor: true, type: true },
    orderBy: { name: "asc" },
  });
  return { people };
}
