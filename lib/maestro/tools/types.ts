import "server-only";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Contexto disponível a cada tool executor.
 * - userId: id do User logado (para auditoria)
 * - personId: id da Person associada (usado em FKs como performedBy)
 */
export interface MaestroToolContext {
  userId: string;
  personId: string;
}

/**
 * Resultado serializável de uma tool. O conteúdo `data` é convertido para
 * string JSON e devolvido ao modelo como tool_result. `display` é uma
 * string curta opcional para a UI mostrar (ex: "Criada tarefa #1234").
 */
export interface MaestroToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  display?: string;
}

export interface MaestroToolDef {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool["input_schema"];
  execute: (input: unknown, ctx: MaestroToolContext) => Promise<MaestroToolResult>;
}
