import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import { resolvePersonByName } from "@/lib/agent-helpers";
import { gateAgentWrite } from "@/lib/maestro/agent-gating";
import { MAESTRO_CHAT_AGENT_ID, MAESTRO_CHAT_CONFIDENCE } from "@/lib/maestro/trust-rules";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  title: z.string().min(1).max(500),
  companyName: z.string().optional(),
  contactName: z.string().optional(),
  value: z.number().optional(),
  stageId: z.string().optional(),
  source: z.string().optional(),
});

export const criarOportunidadeTool: MaestroToolDef = {
  name: "criar_oportunidade",
  description:
    "Cria uma nova oportunidade no pipeline CRM. Passa pelo trust score. Use quando o utilizador quiser registar um novo contacto comercial ou deal.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Título/nome da oportunidade. Obrigatório." },
      companyName: { type: "string", description: "Nome da empresa. Opcional." },
      contactName: { type: "string", description: "Nome do contacto. Opcional." },
      value: { type: "number", description: "Valor estimado em EUR. Opcional." },
      stageId: { type: "string", description: "Fase inicial (default: contacto_inicial)." },
      source: { type: "string", description: "Origem (ex: referência, website, evento). Opcional." },
    },
    required: ["title"],
  },
  async execute(rawInput, ctx) {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) return { ok: false, error: "Input inválido" };
    const input = parsed.data;

    const db = await getTenantDb();
    const [contactId, gating] = await Promise.all([
      input.contactName ? resolvePersonByName(db, input.contactName) : null,
      gateAgentWrite({
        agentId: MAESTRO_CHAT_AGENT_ID,
        extractionType: "decisao",
        confidence: MAESTRO_CHAT_CONFIDENCE,
      }),
    ]);

    const opp = await db.opportunity.create({
      data: {
        tenantId: "",
        title: input.title,
        stageId: input.stageId ?? "contacto_inicial",
        companyName: input.companyName ?? null,
        contactId: contactId ?? null,
        value: input.value ?? null,
        source: input.source ?? null,
        validationStatus: gating.type === "pending" ? "por_confirmar" : "confirmado",
        aiConfidence: MAESTRO_CHAT_CONFIDENCE,
      },
    });

    return {
      ok: true,
      data: { id: opp.id, titulo: input.title, validacao: opp.validationStatus },
      display: gating.type === "pending"
        ? `Criada (por confirmar): ${input.title}`
        : `Criada: ${input.title}`,
    };
  },
};
