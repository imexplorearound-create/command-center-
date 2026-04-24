interface FeedbackApprovedInput {
  projectName: string;
  testCaseCode: string;
  testCaseTitle: string;
  taskTitle: string;
  approvedByName: string;
  taskUrl: string;
  devApiUrl: string;
  feedbackCount: number;
}

export function buildFeedbackApprovedNotification(
  input: FeedbackApprovedInput,
): { subject: string; body: string } {
  const subject = `[${input.projectName}] ${input.testCaseCode} aprovado → task para Bruno`;

  const lines: string[] = [
    `**${input.approvedByName}** aprovou feedback sobre **${input.testCaseCode} — ${input.testCaseTitle}**.`,
    "",
    `Task: ${input.taskTitle}`,
  ];

  if (input.feedbackCount > 1) {
    lines.push(
      "",
      `Esta task agrega ${input.feedbackCount} feedbacks do mesmo test case. O developer vê todos no contexto.`,
    );
  }

  lines.push(
    "",
    `Ver task: ${input.taskUrl}`,
    `API dev (Bruno): \`GET ${input.devApiUrl}\``,
  );

  return { subject, body: lines.join("\n") };
}
