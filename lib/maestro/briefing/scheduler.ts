import "server-only";
import { basePrisma, tenantPrisma } from "@/lib/db";
import type { BriefingTenant } from "./data-collector";

export const BRIEFING_DEFAULT_HOUR = 8;
const ELIGIBLE_ROLES = ["admin", "manager", "membro"] as const;

export interface BriefingTarget {
  tenant: BriefingTenant;
  user: SchedulerUser;
}

export interface SchedulerUser {
  id: string;
  role: string;
  email: string;
  telegramChatId: string | null;
  whatsappPhoneId: string | null;
  notificationPrefs: Record<string, unknown> | null | undefined;
  person: { id: string; name: string } | null;
}

export interface ResolveOptions {
  now?: Date;
  tenantIdFilter?: string;
  userIdFilter?: string;
  force?: boolean;
}

/**
 * Lista users elegíveis para receber briefing nesta janela horária.
 * Itera tenants activos, abre um tenantPrisma por cada, filtra users
 * por role/active/opt-out e (a menos que `force`) por hora preferida
 * coincidente com a hora actual no fuso do tenant.
 */
export async function resolveBriefingTargets(
  options: ResolveOptions = {},
): Promise<BriefingTarget[]> {
  const now = options.now ?? new Date();

  const tenants = await basePrisma.tenant.findMany({
    where: {
      isActive: true,
      ...(options.tenantIdFilter ? { id: options.tenantIdFilter } : {}),
    },
    select: { id: true, name: true, locale: true, timezone: true },
  });

  const targets: BriefingTarget[] = [];

  for (const t of tenants) {
    const tenant: BriefingTenant = {
      id: t.id,
      name: t.name,
      locale: t.locale,
      timezone: t.timezone,
    };

    const hourLocal = options.force ? null : currentHourInTimezone(now, t.timezone);

    const db = tenantPrisma(t.id);
    const users = await db.user.findMany({
      where: {
        isActive: true,
        role: { in: [...ELIGIBLE_ROLES] },
        ...(options.userIdFilter ? { id: options.userIdFilter } : {}),
      },
      select: {
        id: true,
        role: true,
        email: true,
        telegramChatId: true,
        whatsappPhoneId: true,
        notificationPrefs: true,
        person: { select: { id: true, name: true } },
      },
    });

    for (const u of users) {
      const prefs = (u.notificationPrefs ?? {}) as {
        briefing?: { enabled?: boolean; hour?: number };
      };
      const briefingPrefs = prefs.briefing ?? {};
      if (briefingPrefs.enabled === false) continue;

      const userHour = clampHour(briefingPrefs.hour ?? BRIEFING_DEFAULT_HOUR);
      if (hourLocal !== null && userHour !== hourLocal) continue;

      targets.push({
        tenant,
        user: {
          id: u.id,
          role: u.role,
          email: u.email,
          telegramChatId: u.telegramChatId,
          whatsappPhoneId: u.whatsappPhoneId,
          notificationPrefs: u.notificationPrefs as Record<string, unknown> | null,
          person: u.person,
        },
      });
    }
  }

  return targets;
}

function clampHour(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return BRIEFING_DEFAULT_HOUR;
  return Math.min(23, Math.max(0, Math.floor(n)));
}

export function currentHourInTimezone(now: Date, timezone: string): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const hourPart = parts.find((p) => p.type === "hour");
    if (!hourPart) return now.getUTCHours();
    return Number(hourPart.value);
  } catch {
    return now.getUTCHours();
  }
}
