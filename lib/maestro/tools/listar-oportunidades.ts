import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  stageId: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const listarOportunidadesTool: MaestroToolDef = {
  name: "listar_oportunidades",
  description:
    "Devolve oportunidades do pipeline comercial (CRM). Pode filtrar por fase. Use quando o utilizador perguntar sobre deals, pipeline, vendas, ou oportunidades.",
  inputSchema: {
    type: "object",
    properties: {
      stageId: {
        type: "string",
        description: "Filtrar por fase: contacto_inicial, qualificacao, proposta, negociacao, ganho, perdido",
      },
      limit: { type: "number", description: "Máximo de resultados (default 20)" },
    },
    required: [],
  },
  async execute(rawInput) {
    const parsed = inputSchema.safeParse(rawInput ?? {});
    if (!parsed.success) return { ok: false, error: "Input inválido" };

    const db = await getTenantDb();
    const where: Record<string, unknown> = { archivedAt: null };
    if (parsed.data.stageId) where.stageId = parsed.data.stageId;

    const opps = await db.opportunity.findMany({
      where,
      include: {
        contact: { select: { name: true } },
        owner: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: parsed.data.limit ?? 20,
    });

    return {
      ok: true,
      data: opps.map((o) => ({
        id: o.id,
        titulo: o.title,
        fase: o.stageId,
        valor: o.value ? Number(o.value) : null,
        probabilidade: o.probability,
        empresa: o.companyName,
        contacto: o.contact?.name ?? null,
        responsavel: o.owner?.name ?? null,
      })),
      display: `${opps.length} oportunidade(s)`,
    };
  },
};
