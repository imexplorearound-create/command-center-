import "server-only";
import { getTenantDb } from "@/lib/tenant";
import { getWeekBounds, formatDuration } from "@/lib/utils";
import type { MaestroToolDef } from "./types";

export const resumoHorasTool: MaestroToolDef = {
  name: "resumo_horas_semana",
  description:
    "Devolve o resumo de horas da semana actual do utilizador. Total, facturáveis, rascunhos.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  async execute(_rawInput, ctx) {
    const db = await getTenantDb();
    const { monday, sunday } = getWeekBounds();

    const entries = await db.timeEntry.findMany({
      where: {
        personId: ctx.personId,
        date: { gte: monday, lte: sunday },
        archivedAt: null,
      },
      select: { duration: true, isBillable: true, status: true },
    });

    const total = entries.reduce((s, e) => s + e.duration, 0);
    const billable = entries.filter((e) => e.isBillable).reduce((s, e) => s + e.duration, 0);
    const draftCount = entries.filter((e) => e.status === "draft").length;

    return {
      ok: true,
      data: {
        total: formatDuration(total),
        totalMinutos: total,
        facturaveis: formatDuration(billable),
        rascunhos: draftCount,
        registos: entries.length,
      },
      display: `${formatDuration(total)} esta semana (${draftCount} rascunhos)`,
    };
  },
};
