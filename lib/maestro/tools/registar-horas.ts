import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import { resolveProjectSlug } from "@/lib/agent-helpers";
import { gateAgentWrite } from "@/lib/maestro/agent-gating";
import { MAESTRO_CHAT_AGENT_ID, MAESTRO_CHAT_CONFIDENCE } from "@/lib/maestro/trust-rules";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  projectSlug: z.string().optional(),
  hours: z.number().min(0.1).max(24),
  description: z.string().optional(),
  date: z.string().optional(), // YYYY-MM-DD, default today
  billable: z.boolean().optional(),
});

export const registarHorasTool: MaestroToolDef = {
  name: "registar_horas",
  description:
    "Regista horas trabalhadas no projecto. Passa pelo trust score. Use quando o utilizador quiser registar tempo gasto.",
  inputSchema: {
    type: "object",
    properties: {
      projectSlug: { type: "string", description: "Slug do projecto. Opcional." },
      hours: { type: "number", description: "Horas a registar (ex: 2.5). Obrigatório." },
      description: { type: "string", description: "Descrição do trabalho. Opcional." },
      date: { type: "string", description: "Data no formato YYYY-MM-DD (default: hoje)." },
      billable: { type: "boolean", description: "Facturável (default: true)." },
    },
    required: ["hours"],
  },
  async execute(rawInput, ctx) {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) return { ok: false, error: "Input inválido" };
    const input = parsed.data;

    const db = await getTenantDb();
    const [resolved, gating] = await Promise.all([
      input.projectSlug ? resolveProjectSlug(db, input.projectSlug) : null,
      gateAgentWrite({
        agentId: MAESTRO_CHAT_AGENT_ID,
        extractionType: "tarefa",
        confidence: MAESTRO_CHAT_CONFIDENCE,
      }),
    ]);

    if (input.projectSlug && !resolved) {
      return { ok: false, error: `Projecto '${input.projectSlug}' não encontrado.` };
    }

    const duration = Math.round(input.hours * 60); // Convert to minutes
    const date = input.date ? new Date(input.date) : new Date();

    const entry = await db.timeEntry.create({
      data: {
        tenantId: "",
        personId: ctx.personId,
        projectId: resolved?.projectId ?? null,
        date,
        duration,
        description: input.description ?? null,
        isBillable: input.billable ?? true,
        status: "draft",
        origin: "maestro",
      },
    });

    return {
      ok: true,
      data: { id: entry.id, duracao: `${input.hours}h`, data: date.toISOString().split("T")[0] },
      display: `Registadas ${input.hours}h${resolved ? ` no ${input.projectSlug}` : ""}`,
    };
  },
};
