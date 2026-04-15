import type { FeedbackClassification } from "@/lib/feedback-classify";

const CLASSIFICATION_LABELS: Record<string, string> = {
  bug: "Bug",
  suggestion: "Sugestão",
  question: "Questão",
  praise: "Elogio",
};

const PRIORITY_LABELS: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export function buildFeedbackEmailBody(input: {
  classification: FeedbackClassification;
  actionPlan: string | null;
  transcript: string;
  testerName: string;
  pageUrl?: string;
  audioUrl: string;
  actionUrl: string;
}): string {
  const { classification: c, actionPlan, transcript, testerName } = input;
  const typeLabel = CLASSIFICATION_LABELS[c.classification] || c.classification;
  const prioLabel = PRIORITY_LABELS[c.priority] || c.priority;
  const confidencePct = Math.round(c.confidence * 100);

  const lines: string[] = [
    `# 🎤 ${typeLabel} (${prioLabel}) — ${c.module}`,
    "",
    "## O que foi reportado",
    `**Tester:** ${testerName}`,
    input.pageUrl ? `**Página:** ${input.pageUrl}` : "",
    `▶ [Ouvir gravação](${input.actionUrl})`,
    "",
    `> ${transcript.slice(0, 500)}`,
    "",
    `## Classificação AI (${confidencePct}% confiança)`,
    `**Tipo:** ${typeLabel} · **Módulo:** ${c.module} · **Prioridade:** ${prioLabel}`,
    `**Resumo:** ${c.summary}`,
  ];

  if (actionPlan) {
    lines.push("", "## Plano de ação", "", actionPlan);
  }

  lines.push(
    "",
    "---",
    `[✓ Confirmar · ✎ Editar · ✗ Rejeitar](${input.actionUrl})`
  );

  return lines.filter((l) => l !== undefined).join("\n");
}

export function buildFeedbackTaskDescription(
  transcript: string,
  classification: FeedbackClassification,
  actionPlan: string | null,
  testerName: string
): string {
  const lines = [
    `**Transcrição:** ${transcript.slice(0, 500)}`,
    `**Tester:** ${testerName}`,
    `**Módulo:** ${classification.module}`,
    `**Classificação:** ${classification.classification} (${Math.round(classification.confidence * 100)}%)`,
  ];
  if (actionPlan) {
    lines.push("", "---", "", "## Plano de ação", "", actionPlan);
  }
  return lines.join("\n");
}
