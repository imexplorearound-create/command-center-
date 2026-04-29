import "server-only";
import type { BriefingData } from "./data-collector";

export function buildBriefingSystemPrompt(locale: string, tenantName: string): string {
  if (locale.startsWith("en")) {
    return [
      `You are the Maestro of ${tenantName}, generating a daily briefing for one user.`,
      "Read the JSON dataset and produce a concise markdown summary, max 10 lines.",
      "Mark overdue tasks with 🔴 and tasks with deadline ≤3 days with 🟡.",
      "End with 1 to 3 priorities for today, prefixed with '**Prioridades de hoje:**'.",
      "Do NOT invent data beyond the JSON. Do NOT use tools. Do NOT greet at length.",
      "If a section has no items, omit it entirely.",
    ].join("\n");
  }
  return [
    `És o Maestro de ${tenantName}, a gerar um briefing diário para um utilizador.`,
    "Lê o JSON com os dados e produz um resumo em markdown, max 10 linhas, em PT-PT.",
    "Marca tarefas vencidas com 🔴 e tarefas com deadline ≤3 dias com 🟡.",
    "Termina com 1 a 3 prioridades para hoje, prefixadas com '**Prioridades de hoje:**'.",
    "NÃO inventes dados para lá do JSON. NÃO uses ferramentas. NÃO faças saudações longas.",
    "Se uma secção estiver vazia, omite-a por completo.",
  ].join("\n");
}

export function serializeBriefingData(data: BriefingData): string {
  const payload = {
    user: { name: data.user.name, role: data.user.role },
    tenant: { name: data.tenant.name, locale: data.tenant.locale },
    overdueTasks: data.overdueTasks.map((t) => ({
      title: t.title,
      project: t.projectName,
      deadline: t.deadline,
      daysLate: t.daysLate,
      priority: t.priority,
    })),
    dueSoonTasks: data.dueSoonTasks.map((t) => ({
      title: t.title,
      project: t.projectName,
      deadline: t.deadline,
      daysUntil: t.daysUntil,
      priority: t.priority,
    })),
    pendingValidations: data.pendingValidations.map((v) => ({
      title: v.title,
      kind: v.kind,
    })),
    recentChanges: data.recentChanges,
    trustDeltas: data.trustDeltas,
  };
  return JSON.stringify(payload, null, 2);
}

export function buildBriefingUserMessage(data: BriefingData): string {
  return [
    "Dados do dia:",
    "",
    "```json",
    serializeBriefingData(data),
    "```",
    "",
    "Gera o briefing.",
  ].join("\n");
}
