import "server-only";
import { getTenantDb } from "@/lib/tenant";
import type { EmailRecordData } from "@/lib/types";
import type { EmailFilters } from "@/lib/validation/email-record-schema";

export async function getEmailRecords(filters?: EmailFilters): Promise<EmailRecordData[]> {
  const db = await getTenantDb();
  const where: Record<string, unknown> = {};

  if (filters?.projectId) where.projectId = filters.projectId;
  if (filters?.clientId) where.clientId = filters.clientId;
  if (filters?.isProcessed !== undefined) where.isProcessed = filters.isProcessed;
  if (filters?.validationStatus) where.validationStatus = filters.validationStatus;
  if (filters?.dateFrom || filters?.dateTo) {
    where.receivedAt = {};
    if (filters.dateFrom) (where.receivedAt as Record<string, unknown>).gte = new Date(filters.dateFrom);
    if (filters.dateTo) (where.receivedAt as Record<string, unknown>).lte = new Date(filters.dateTo);
  }

  const records = await db.emailRecord.findMany({
    where,
    include: {
      project: { select: { name: true } },
      client: { select: { companyName: true } },
      person: { select: { name: true } },
    },
    orderBy: { receivedAt: "desc" },
    take: 200,
  });

  return records.map((r) => ({
    id: r.id,
    gmailId: r.gmailId,
    threadId: r.threadId,
    subject: r.subject,
    from: r.from,
    to: r.to,
    cc: r.cc,
    snippet: r.snippet,
    receivedAt: r.receivedAt.toISOString(),
    direction: r.direction,
    isProcessed: r.isProcessed,
    projectId: r.projectId,
    projectName: r.project?.name ?? null,
    clientId: r.clientId,
    clientName: r.client?.companyName ?? null,
    personId: r.personId,
    personName: r.person?.name ?? null,
    opportunityId: r.opportunityId,
    validationStatus: r.validationStatus,
    categorizationMethod: r.categorizationMethod,
  }));
}

export async function getEmailRecordsByProject(projectId: string): Promise<EmailRecordData[]> {
  return getEmailRecords({ projectId });
}

export async function getEmailRecordsByClient(clientId: string): Promise<EmailRecordData[]> {
  return getEmailRecords({ clientId });
}

export async function getUnprocessedEmailCount(): Promise<number> {
  const db = await getTenantDb();
  return db.emailRecord.count({ where: { isProcessed: false } });
}
