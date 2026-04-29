import "server-only";
import type { Prisma } from "@prisma/client";
import { tenantPrisma, type TenantPrisma } from "@/lib/db";
import { notifyUser } from "@/lib/notifications";
import {
  collectBriefingData,
  isBriefingDataEmpty,
  type BriefingTenant,
  type BriefingUser,
  type BriefingData,
} from "./data-collector";
import { generateBriefingMarkdown } from "./generator";
import { firstNonEmptyLine } from "./util";

export const BRIEFING_STATUS = {
  DELIVERED: "delivered",
  SKIPPED_EXISTING: "skipped_existing",
  SKIPPED_EMPTY: "skipped_empty",
  FAILED: "failed",
} as const;

export type BriefingStatus = (typeof BRIEFING_STATUS)[keyof typeof BRIEFING_STATUS];
export type RunStatus = BriefingStatus;

type Channel = "email" | "telegram" | "whatsapp" | "inapp";

export interface RunResult {
  status: BriefingStatus;
  briefingId?: string;
  channel?: Channel;
  error?: string;
}

export interface RunOptions {
  force?: boolean;
  now?: Date;
}

interface NotificationPrefs {
  channels?: string[];
  briefing?: { enabled?: boolean; hour?: number; channel?: string };
  types?: Record<string, string[]>;
}

export interface UserRecord {
  id: string;
  role: string;
  email: string;
  notificationPrefs: unknown;
  telegramChatId: string | null;
  whatsappPhoneId: string | null;
  person: { id: string; name: string } | null;
}

export async function runBriefingForUser(
  tenant: BriefingTenant,
  userRecord: UserRecord,
  options: RunOptions = {},
): Promise<RunResult> {
  const db = tenantPrisma(tenant.id);
  const now = options.now ?? new Date();
  const briefingDate = toLocalDate(now, tenant.timezone);

  const existing = await db.maestroBriefing.findUnique({
    where: { userId_briefingDate: { userId: userRecord.id, briefingDate } },
    select: { id: true, status: true },
  });

  if (existing && !options.force && existing.status === BRIEFING_STATUS.DELIVERED) {
    return { status: BRIEFING_STATUS.SKIPPED_EXISTING, briefingId: existing.id };
  }

  if (!userRecord.person) {
    return { status: BRIEFING_STATUS.FAILED, error: "User sem Person associada" };
  }

  const briefingUser: BriefingUser = {
    id: userRecord.id,
    role: userRecord.role,
    name: userRecord.person.name,
    personId: userRecord.person.id,
  };

  const data = await collectBriefingData(db, { tenant, user: briefingUser, now });
  const baseUpsert = {
    tenantId: tenant.id,
    userId: userRecord.id,
    briefingDate,
    locale: tenant.locale,
  };

  if (isBriefingDataEmpty(data)) {
    const row = await upsertBriefing(db, baseUpsert, {
      content: "",
      dataSnapshot: data,
      status: BRIEFING_STATUS.SKIPPED_EMPTY,
    });
    return { status: BRIEFING_STATUS.SKIPPED_EMPTY, briefingId: row.id };
  }

  let generated;
  try {
    generated = await generateBriefingMarkdown(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    const row = await upsertBriefing(db, baseUpsert, {
      content: "",
      dataSnapshot: data,
      status: BRIEFING_STATUS.FAILED,
      errorMessage: message,
    });
    return { status: BRIEFING_STATUS.FAILED, briefingId: row.id, error: message };
  }

  const channel = resolveBriefingChannel(userRecord);

  if (channel !== "inapp") {
    await notifyUser(userRecord.id, {
      type: "maestro_briefing",
      subject: buildSubject(briefingDate, tenant.locale),
      summary: firstNonEmptyLine(generated.content, 200),
      body: generated.content,
      actionUrl: `/maestro/briefings`,
    });
  }

  const row = await upsertBriefing(db, baseUpsert, {
    content: generated.content,
    dataSnapshot: data,
    status: BRIEFING_STATUS.DELIVERED,
    channel,
    deliveredAt: new Date(),
    llmModel: generated.model,
    llmUsageInput: generated.usageInput,
    llmUsageOutput: generated.usageOutput,
  });

  return { status: BRIEFING_STATUS.DELIVERED, briefingId: row.id, channel };
}

interface BaseUpsert {
  tenantId: string;
  userId: string;
  briefingDate: Date;
  locale: string;
}

interface MutableFields {
  content: string;
  dataSnapshot: BriefingData;
  status: BriefingStatus;
  channel?: Channel | null;
  deliveredAt?: Date | null;
  errorMessage?: string;
  llmModel?: string | null;
  llmUsageInput?: number | null;
  llmUsageOutput?: number | null;
}

async function upsertBriefing(
  db: TenantPrisma,
  base: BaseUpsert,
  mutable: MutableFields,
) {
  const fields = {
    content: mutable.content,
    dataSnapshot: mutable.dataSnapshot as unknown as Prisma.InputJsonValue,
    status: mutable.status,
    channel: mutable.channel ?? null,
    errorMessage: mutable.errorMessage ?? null,
    llmModel: mutable.llmModel ?? null,
    llmUsageInput: mutable.llmUsageInput ?? null,
    llmUsageOutput: mutable.llmUsageOutput ?? null,
  };
  return db.maestroBriefing.upsert({
    where: {
      userId_briefingDate: { userId: base.userId, briefingDate: base.briefingDate },
    },
    create: { ...base, ...fields, deliveredAt: mutable.deliveredAt ?? null },
    update: {
      ...fields,
      generatedAt: new Date(),
      deliveredAt: mutable.deliveredAt ?? null,
      readAt: null,
    },
    select: { id: true },
  });
}

const CHANNEL_REQUIREMENTS: Array<[Channel, (u: UserRecord) => boolean]> = [
  ["telegram", (u) => Boolean(u.telegramChatId)],
  ["whatsapp", (u) => Boolean(u.whatsappPhoneId)],
  ["email", (u) => Boolean(u.email)],
];

export function resolveBriefingChannel(user: UserRecord): Channel {
  const prefs = (user.notificationPrefs ?? {}) as NotificationPrefs;
  const candidate = prefs.briefing?.channel ?? prefs.channels?.[0];

  for (const [channel, hasIdentity] of CHANNEL_REQUIREMENTS) {
    if (candidate === channel && hasIdentity(user)) return channel;
  }
  for (const [channel, hasIdentity] of CHANNEL_REQUIREMENTS) {
    if (hasIdentity(user)) return channel;
  }
  return "inapp";
}

/**
 * Dia lógico do tenant — converte `now` para a data calendário no fuso do tenant
 * e devolve um Date à 00:00 UTC dessa data (compatível com Prisma `@db.Date`).
 */
export function toLocalDate(now: Date, timezone: string): Date {
  try {
    const fmt = getDateFormatter(timezone);
    const iso = fmt.format(now);
    return new Date(`${iso}T00:00:00.000Z`);
  } catch {
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }
}

const dateFmtCache = new Map<string, Intl.DateTimeFormat>();
function getDateFormatter(timezone: string): Intl.DateTimeFormat {
  let fmt = dateFmtCache.get(timezone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dateFmtCache.set(timezone, fmt);
  }
  return fmt;
}

function buildSubject(briefingDate: Date, locale: string): string {
  const d = briefingDate.toISOString().slice(0, 10);
  return locale.startsWith("en")
    ? `Maestro briefing · ${d}`
    : `Briefing Maestro · ${d}`;
}
