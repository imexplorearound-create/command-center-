import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { MaestroToolDef } from "./types";

// Core tools (always available)
import { listarProjectosTool } from "./listar-projectos";
import { listarTarefasTool } from "./listar-tarefas";
import { listarPessoasTool } from "./listar-pessoas";
import { criarTarefaTool } from "./criar-tarefa";
import { actualizarTarefaTool } from "./actualizar-tarefa";
import { mudarEstadoTarefaTool } from "./mudar-estado-tarefa";
import { atribuirResponsavelTool } from "./atribuir-responsavel";
import { comentarTarefaTool } from "./comentar-tarefa";
import { concluirTarefaTool } from "./concluir-tarefa";

// CRM tools
import { listarOportunidadesTool } from "./listar-oportunidades";
import { criarOportunidadeTool } from "./criar-oportunidade";
import { listarClientesTool } from "./listar-clientes";

// Timetracking tools
import { registarHorasTool } from "./registar-horas";
import { resumoHorasTool } from "./resumo-horas";

// Email tools
import { pesquisarEmailsTool } from "./pesquisar-emails";
import { categorizarEmailTool } from "./categorizar-email";

// Investment tools
import { estadoInvestimentoTool } from "./estado-investimento";

// ─── Registry ──────────────────────────────────────────────

const CORE_TOOLS: MaestroToolDef[] = [
  listarProjectosTool,
  listarTarefasTool,
  listarPessoasTool,
  criarTarefaTool,
  actualizarTarefaTool,
  mudarEstadoTarefaTool,
  atribuirResponsavelTool,
  comentarTarefaTool,
  concluirTarefaTool,
];

const MODULE_TOOLS: Record<string, MaestroToolDef[]> = {
  crm: [listarOportunidadesTool, criarOportunidadeTool, listarClientesTool],
  timetracking: [registarHorasTool, resumoHorasTool],
  "email-sync": [pesquisarEmailsTool, categorizarEmailTool],
  "cross-projects": [estadoInvestimentoTool],
};

/** Get all tools available for a tenant based on enabled modules. */
export function getToolsForTenant(enabledModules: string[]): MaestroToolDef[] {
  const tools = [...CORE_TOOLS];
  for (const key of enabledModules) {
    const moduleTools = MODULE_TOOLS[key];
    if (moduleTools) tools.push(...moduleTools);
  }
  return tools;
}

/** Get tools in Anthropic SDK format. */
export function getToolsForAPI(enabledModules: string[]): Anthropic.Tool[] {
  return getToolsForTenant(enabledModules).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

// Build a lookup from all registered tools
const ALL_TOOLS = new Map<string, MaestroToolDef>();
for (const t of CORE_TOOLS) ALL_TOOLS.set(t.name, t);
for (const tools of Object.values(MODULE_TOOLS)) {
  for (const t of tools) ALL_TOOLS.set(t.name, t);
}

export function findTool(name: string): MaestroToolDef | undefined {
  return ALL_TOOLS.get(name);
}

// Legacy exports for backward compatibility
export const MAESTRO_TOOL_DEFS = CORE_TOOLS;
export const MAESTRO_TOOLS_FOR_API: Anthropic.Tool[] = CORE_TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.inputSchema,
}));

export type { MaestroToolDef, MaestroToolContext, MaestroToolResult } from "./types";
