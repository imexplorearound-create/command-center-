/**
 * Primeira linha não-vazia de um markdown, sem heading marker e cortada
 * a `maxLength`. Usada para excerpts de listas e summary de notificações.
 */
export function firstNonEmptyLine(content: string, maxLength = 160): string {
  const line = content.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.replace(/^#+\s*/, "").slice(0, maxLength);
}
