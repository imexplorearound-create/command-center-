type MaestroResponse = { content: Array<{ type: string; text?: string }> };

/**
 * Extrai o primeiro bloco de texto da resposta do Maestro. Thinking-safe:
 * ignora blocos de tipo `thinking`/`tool_use`/etc. Não concatena N blocos
 * (alguns modelos retornam thinking + text — concatenar mistura conteúdos).
 */
export function extractTextBlock(response: MaestroResponse): string {
  for (const block of response.content) {
    if (block.type === "text" && block.text) return block.text;
  }
  return "";
}
