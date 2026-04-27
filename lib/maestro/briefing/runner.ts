import "server-only";
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

export type RunStatus = "delivered" | "skipped_empty" | "skipped_existing" | "failed";

export interface RunResult {
  status: RunStatus;
  briefingId?: string;
  channel?: string;
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

/**
 * Gera (e entrega) o briefing diário para um user.
 * Idempotente por (userId, briefingDate). Re-correr no mesmo dia com
 * force:true regera; sem force devolve {status:"skipped_existing"}.
 */
export async function runBriefingForUser(
  tenant: BriefingTenant,
  userRecord: UserRecord,
  options: RunOptions = {},
): Promise<RunResult> {
  const db = tenantPrisma(tenant.id);
  const now = options.now ?? new Date();
  const briefingDate = toLocalDate(now, tenant.timezone);

  const existing = await db.maestroBriefing.findUnique({
    where: {
      userId_briefingDate: { userId: userRecord.id, briefingDate },
    },
    select: { id: true, status: true, deliveredAt: true },
  });

  if (existing && !options.force && existing.status === "delivered") {
    return { status: "skipped_existing", briefingId: existing.id };
  }

  if (!userRecord.person) {
    return { status: "failed", error: "User sem Person associada" };
  }

  const briefingUser: BriefingUser = {
    id: userRecord.id,
    role: userRecord.role,
    name: userRecord.person.name,
    personId: userRecord.person.id,
  };

  const data = await collectBriefingData(db, { tenant, user: briefingUser, now });

  if (isBriefingDataEmpty(data)) {
    const row = await upsertBriefing(db, {
      tenantId: tenant.id,
      userId: userRecord.id,
      briefingDate,
      locale: tenant.locale,
      content: "",
      dataSnapshot: data,
      status: "skipped_empty",
    });
    return { status: "skipped_empty", briefingId: row.id };
  }

  let generated;
  try {
    generated = await generateBriefingMarkdown(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    const row = await upsertBriefing(db, {
      tenantId: tenant.id,
      userId: userRecord.id,
      briefingDate,
      locale: tenant.locale,
      content: "",
      dataSnapshot: data,
      status: "failed",
      errorMessage: message,
    });
    return { status: "failed", briefingId: row.id, error: message };
  }

  const channel = resolveBriefingChannel(userRecord);

  const row = await upsertBriefing(db, {
    tenantId: tenant.id,
    userId: userRecord.id,
    briefingDate,
    locale: tenant.locale,
    content: generated.content,
    dataSnapshot: data,
    status: "pending",
    channel,
    llmModel: generated.model,
    llmUsageInput: generated.usageInput,
    llmUsageOutput: generated.usageOutput,
  });

  if (channel !== "inapp") {
    await notifyUser(userRecord.id, {
      type: "maestro_briefing",
      subject: buildSubject(briefingDate, tenant.locale),
      summary: extractFirstLine(generated.content),
      body: generated.content,
      actionUrl: `/maestro/briefings`,
    });
  }

  await db.maestroBriefing.update({
    where: { id: row.id },
    data: { status: "delivered", deliveredAt: new Date(), channel },
  });

  return { status: "delivered", briefingId: row.id, channel };
}

interface UpsertInput {
  tenantId: string;
  userId: string;
  briefingDate: Date;
  locale: string;
  content: string;
  dataSnapshot: BriefingData;
  status: string;
  channel?: string | null;
  errorMessage?: string;
  llmModel?: string | null;
  llmUsageInput?: number | null;
  llmUsageOutput?: number | null;
}

async function upsertBriefing(db: TenantPrisma, input: UpsertInput) {
  return db.maestroBriefing.upsert({
    where: {
      userId_briefingDate: {
        userId: input.userId,
        briefingDate: input.briefingDate,
      },
    },
    create: {
      tenantId: input.tenantId,
      userId: input.userId,
      briefingDate: input.briefingDate,
      locale: input.locale,
      content: input.content,
      dataSnapshot: input.dataSnapshot as never,
      status: input.status,
      channel: input.channel ?? null,
      errorMessage: input.errorMessage ?? null,
      llmModel: input.llmModel ?? null,
      llmUsageInput: input.llmUsageInput ?? null,
      llmUsageOutput: input.llmUsageOutput ?? null,
    },
    update: {
      content: input.content,
      dataSnapshot: input.dataSnapshot as never,
      status: input.status,
      channel: input.channel ?? null,
      errorMessage: input.errorMessage ?? null,
      llmModel: input.llmModel ?? null,
      llmUsageInput: input.llmUsageInput ?? null,
      llmUsageOutput: input.llmUsageOutput ?? null,
      generatedAt: new Date(),
      deliveredAt: null,
      readAt: null,
    },
    select: { id: true },
  });
}

export function resolveBriefingChannel(user: UserRecord): string {
  const prefs = (user.notificationPrefs ?? {}) as NotificationPrefs;
  const explicit = prefs.briefing?.channel;
  const fallback = prefs.channels?.[0];
  const candidate = explicit ?? fallback;

  if (candidate === "telegram" && user.telegramChatId) return "telegram";
  if (candidate === "whatsapp" && user.whatsappPhoneId) return "whatsapp";
  if (candidate === "email" && user.email) return "email";

  // sem preferência ou canal escolhido sem dados → fallback razoável
  if (user.email) return "email";
  if (user.telegramChatId) return "telegram";
  if (user.whatsappPhoneId) return "whatsapp";
  return "inapp";
}

/**
 * Dia lógico do tenant — converte `now` para a data calendário no fuso do tenant
 * e devolve um Date à 00:00 UTC dessa data (compatível com Prisma `@db.Date`).
 */
export function toLocalDate(now: Date, timezone: string): Date {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const iso = fmt.format(now);
    return new Date(`${iso}T00:00:00.000Z`);
  } catch {
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }
}

function buildSubject(briefingDate: Date, locale: string): string {
  const d = briefingDate.toISOString().slice(0, 10);
  return locale.startsWith("en")
    ? `Maestro briefing · ${d}`
    : `Briefing Maestro · ${d}`;
}

function extractFirstLine(content: string): string {
  const line = content.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.replace(/^#+\s*/, "").slice(0, 200);
}
