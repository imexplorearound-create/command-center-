interface ReadyForVerificationInput {
  projectName: string;
  testCaseCode: string;
  testCaseTitle: string;
  taskTitle: string;
  feedbackCount: number;
  verifyRejectionsCount: number;
  actionUrl: string;
}

export function buildReadyForVerificationNotification(
  input: ReadyForVerificationInput,
): { subject: string; body: string } {
  const roundLabel =
    input.verifyRejectionsCount > 0
      ? ` (round ${input.verifyRejectionsCount + 1})`
      : "";
  const subject = `[${input.projectName}] ${input.testCaseCode} pronto a verificar${roundLabel}`;

  const lines: string[] = [
    `O developer marcou **${input.testCaseCode} — ${input.testCaseTitle}** como pronto a verificar.`,
    "",
    `Task: ${input.taskTitle}`,
  ];

  if (input.feedbackCount > 1) {
    lines.push(`Agrega ${input.feedbackCount} feedbacks deste test case.`);
  }

  if (input.verifyRejectionsCount > 0) {
    lines.push(
      "",
      `⚠️ Esta é a ${input.verifyRejectionsCount + 1}ª vez que chega para verificação (já foi rejeitado ${input.verifyRejectionsCount}×).`,
    );
  }

  lines.push("", `Verificar: ${input.actionUrl}`);

  return { subject, body: lines.join("\n") };
}
