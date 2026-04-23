import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import { resolveProjectSlug } from "@/lib/agent-helpers";
import { formatCurrency, executionPercent } from "@/lib/utils";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  projectSlug: z.string(),
});

export const estadoInvestimentoTool: MaestroToolDef = {
  name: "estado_investimento",
  description:
    "Devolve o estado de execução orçamental de um projecto (mapa de investimento, rubricas, percentagem executada).",
  inputSchema: {
    type: "object",
    properties: {
      projectSlug: { type: "string", description: "Slug do projecto. Obrigatório." },
    },
    required: ["projectSlug"],
  },
  async execute(rawInput) {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) return { ok: false, error: "Input inválido" };

    const db = await getTenantDb();
    const resolved = await resolveProjectSlug(db, parsed.data.projectSlug);
    if (!resolved) return { ok: false, error: `Projecto '${parsed.data.projectSlug}' não encontrado.` };

    const map = await db.investmentMap.findFirst({
      where: { projectId: resolved.projectId, archivedAt: null },
      include: {
        rubrics: {
          where: { archivedAt: null },
          include: { area: { select: { name: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!map) return { ok: true, data: null, display: "Sem mapa de investimento" };

    const totalExecuted = map.rubrics.reduce((s, r) => s + Number(r.budgetExecuted), 0);

    return {
      ok: true,
      data: {
        orcamentoTotal: formatCurrency(Number(map.totalBudget)),
        totalExecutado: formatCurrency(totalExecuted),
        percentagemExecucao: executionPercent(totalExecuted, Number(map.totalBudget)),
        fonteFinanciamento: map.fundingSource,
        rubricas: map.rubrics.map((r) => ({
          nome: r.name,
          alocado: formatCurrency(Number(r.budgetAllocated)),
          executado: formatCurrency(Number(r.budgetExecuted)),
          execucao: executionPercent(Number(r.budgetExecuted), Number(r.budgetAllocated)),
          departamento: r.area?.name ?? null,
        })),
      },
      display: `Investimento: ${formatCurrency(totalExecuted)} / ${formatCurrency(Number(map.totalBudget))}`,
    };
  },
};
