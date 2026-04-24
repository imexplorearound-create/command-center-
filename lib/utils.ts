import type { Health, Priority, TaskStatus } from "./types";

export const LOCALE = "pt-PT";

const dateFormatterLong = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric" });
const dateFormatterShort = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short" });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: "short", timeStyle: "short" });
const monthFormatter = new Intl.DateTimeFormat(LOCALE, { month: "short" });

export function formatDate(date: Date | string): string {
  return dateFormatterLong.format(new Date(date));
}

export function formatDateShort(date: Date | string): string {
  return dateFormatterShort.format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return dateTimeFormatter.format(new Date(date));
}

export function formatMonth(date: Date | string): string {
  return monthFormatter.format(new Date(date));
}

export function healthColor(health: Health): string {
  switch (health) {
    case "green": return "var(--green)";
    case "yellow": return "var(--yellow)";
    case "red": return "var(--red)";
  }
}

export function healthLabel(health: Health): string {
  switch (health) {
    case "green": return "No ritmo";
    case "yellow": return "Atenção";
    case "red": return "Em risco";
  }
}

export function healthBg(health: Health): string {
  switch (health) {
    case "green": return "rgba(34,197,94,0.12)";
    case "yellow": return "rgba(234,179,8,0.12)";
    case "red": return "rgba(239,68,68,0.12)";
  }
}

export function priorityColor(priority: Priority): string {
  switch (priority) {
    case "critica": return "var(--red)";
    case "alta": return "var(--orange)";
    case "media": return "var(--yellow)";
    case "baixa": return "var(--green)";
  }
}

export function progressColor(pct: number): string {
  if (pct >= 80) return "var(--green)";
  if (pct >= 40) return "var(--yellow)";
  return "var(--red)";
}

export function progressPercent(current: number, target: number): number {
  if (!target) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function taskStatusColor(status: TaskStatus): string {
  switch (status) {
    case "backlog": return "var(--muted)";
    case "a_fazer": return "var(--yellow)";
    case "em_curso": return "var(--accent)";
    case "em_revisao": return "var(--orange)";
    case "feito": return "var(--green)";
  }
}

export function healthBadge(health: Health): { color: string; bg: string; label: string } {
  return { color: healthColor(health), bg: healthBg(health), label: healthLabel(health) };
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export function scoreColor(score: number): string {
  if (score >= 50) return "var(--green)";
  if (score >= 30) return "var(--yellow)";
  return "var(--red)";
}

export function confidenceColor(pct: number): { color: string; bg: string } {
  if (pct >= 80) return { color: "var(--green)", bg: "var(--green-glow)" };
  if (pct >= 60) return { color: "var(--yellow)", bg: "var(--yellow-glow)" };
  return { color: "var(--red)", bg: "var(--red-glow)" };
}

export function formatCurrency(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getWeekBounds(date = new Date()): { monday: Date; sunday: Date } {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

export function executionPercent(executed: number, allocated: number): number {
  return allocated > 0 ? Math.round((executed / allocated) * 100) : 0;
}

export function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
