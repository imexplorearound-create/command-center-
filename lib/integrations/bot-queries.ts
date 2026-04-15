import { tenantPrisma } from "@/lib/db";
import { getWeekBounds, formatDuration, formatCurrency } from "@/lib/utils";

/** Shared user select shape for bot resolution. */
export const BOT_USER_SELECT = {
  id: true,
  tenantId: true,
  personId: true,
  role: true,
} as const;

export type BotUser = { id: string; tenantId: string; personId: string; role: string };

// ─── Shared Query Functions ────────────────────────────────

export interface ProjectSummary {
  name: string;
  health: string;
  progress: number;
}

export async function fetchActiveProjects(tenantId: string): Promise<ProjectSummary[]> {
  const db = tenantPrisma(tenantId);
  return db.project.findMany({
    where: { archivedAt: null, status: "ativo" },
    select: { name: true, health: true, progress: true },
    orderBy: { name: "asc" },
    take: 10,
  });
}

export interface WeekHoursSummary {
  total: number;
  billable: number;
  draftCount: number;
}

export async function fetchWeekHours(tenantId: string, personId: string): Promise<WeekHoursSummary> {
  const db = tenantPrisma(tenantId);
  const { monday, sunday } = getWeekBounds();

  const entries = await db.timeEntry.findMany({
    where: {
      personId,
      date: { gte: monday, lte: sunday },
      archivedAt: null,
    },
    select: { duration: true, isBillable: true, status: true },
  });

  return {
    total: entries.reduce((s, e) => s + e.duration, 0),
    billable: entries.filter((e) => e.isBillable).reduce((s, e) => s + e.duration, 0),
    draftCount: entries.filter((e) => e.status === "draft").length,
  };
}

export interface PipelineSummary {
  totalDeals: number;
  totalValue: number;
  byStage: Map<string, { count: number; value: number }>;
}

export async function fetchPipelineSummary(tenantId: string): Promise<PipelineSummary> {
  const db = tenantPrisma(tenantId);
  const opps = await db.opportunity.findMany({
    where: { archivedAt: null },
    select: { stageId: true, value: true },
  });

  const byStage = new Map<string, { count: number; value: number }>();
  for (const o of opps) {
    const curr = byStage.get(o.stageId) ?? { count: 0, value: 0 };
    curr.count++;
    curr.value += Number(o.value ?? 0);
    byStage.set(o.stageId, curr);
  }

  return {
    totalDeals: opps.length,
    totalValue: opps.reduce((s, o) => s + Number(o.value ?? 0), 0),
    byStage,
  };
}

// ─── Formatting Helpers ────────────────────────────────────

const STAGE_NAMES: Record<string, string> = {
  contacto_inicial: "Contacto Inicial",
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

export function healthEmoji(health: string): string {
  return health === "green" ? "🟢" : health === "yellow" ? "🟡" : "🔴";
}

export function formatProjectsForTelegram(projects: ProjectSummary[]): string {
  if (projects.length === 0) return "Sem projectos activos.";
  const lines = projects.map((p) => `${healthEmoji(p.health)} <b>${p.name}</b> — ${p.progress}%`);
  return `<b>Projectos Activos (${projects.length})</b>\n\n${lines.join("\n")}`;
}

export function formatProjectsForWhatsApp(projects: ProjectSummary[]): string {
  if (projects.length === 0) return "Sem projectos activos.";
  const lines = projects.map((p) => `${healthEmoji(p.health)} *${p.name}* — ${p.progress}%`);
  return `*Projectos Activos (${projects.length})*\n\n${lines.join("\n")}`;
}

export function formatHoursForTelegram(h: WeekHoursSummary): string {
  return `<b>Horas esta semana</b>\n\nTotal: ${formatDuration(h.total)}\nFacturáveis: ${formatDuration(h.billable)}\nRegistos em rascunho: ${h.draftCount}`;
}

export function formatHoursForWhatsApp(h: WeekHoursSummary): string {
  return `*Horas esta semana*\n\nTotal: ${formatDuration(h.total)}\nFacturáveis: ${formatDuration(h.billable)}\nRegistos em rascunho: ${h.draftCount}`;
}

export function formatPipelineForTelegram(p: PipelineSummary): string {
  const lines = Array.from(p.byStage.entries()).map(([id, s]) => {
    return `• <b>${STAGE_NAMES[id] ?? id}</b>: ${s.count} (${formatCurrency(s.value)})`;
  });
  return `<b>Pipeline Comercial</b>\n${p.totalDeals} oportunidades\n\n${lines.join("\n")}`;
}

export function formatPipelineForWhatsApp(p: PipelineSummary): string {
  return `*Pipeline Comercial*\n\n${p.totalDeals} oportunidades\nValor total: ${formatCurrency(p.totalValue)}`;
}
