import { CLASSIFICATION_LABELS, CLASSIFICATION_EMOJI, SEVERITY_LABELS } from "./feedback-labels";

interface NotificationItem {
  classification: string | null;
  priority: string | null;
  triaged: boolean;
}

interface NotificationInput {
  projectName: string;
  testerName: string;
  items: NotificationItem[];
  actionUrl: string;
  exportUrl: string;
}

export function buildFeedbackSessionNotification(
  input: NotificationInput
): { subject: string; body: string } {
  const total = input.items.length;
  const untriaged = input.items.filter((i) => !i.triaged).length;
  const triaged = input.items.filter((i) => i.triaged);

  const byClass: Record<string, NotificationItem[]> = {};
  for (const it of triaged) {
    const k = it.classification || "outro";
    (byClass[k] ||= []).push(it);
  }

  const classLines = Object.entries(byClass).map(([cls, items]) => {
    const label = CLASSIFICATION_LABELS[cls] || cls;
    const emoji = CLASSIFICATION_EMOJI[cls] || "•";
    const sevs = items
      .map((i) => i.priority ? SEVERITY_LABELS[i.priority] : null)
      .filter((s): s is string => !!s);
    const sevGroup = sevs.length > 0 ? ` (${sevs.join(", ")})` : "";
    return `- ${emoji} ${items.length} ${label}${items.length > 1 ? "s" : ""}${sevGroup}`;
  });

  const subjectSuffix = total === 0
    ? " — sem notas"
    : untriaged > 0
      ? ` — ${total} nota${total > 1 ? "s" : ""} (${untriaged} por triar)`
      : ` — ${total} nota${total > 1 ? "s" : ""}`;

  const subject = `[${input.projectName}] ${input.testerName}${subjectSuffix}`;

  const lines: string[] = [
    `${input.testerName} terminou uma sessão de feedback em **${input.projectName}**.`,
    "",
  ];

  if (total === 0) {
    lines.push("Sessão sem notas gravadas.");
  } else {
    if (classLines.length > 0) lines.push(...classLines, "");
    if (untriaged > 0) {
      lines.push(`⚠️ **${untriaged} ${untriaged === 1 ? "item" : "items"} por triar** — severidade e passos pendentes.`, "");
    }
  }

  lines.push(
    "---",
    "",
    `**Ver e triar:** ${input.actionUrl}`,
    `**Descarregar relatório (.md):** ${input.exportUrl}`
  );

  return { subject, body: lines.join("\n") };
}
