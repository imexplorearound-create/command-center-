import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant";
import { decisionKindEnum, decisionSeverityEnum } from "@/lib/validation/decision-schema";
import { resolveProjectSlug } from "@/lib/agent-helpers";
import { gateAgentWrite } from "@/lib/maestro/agent-gating";
import { MAESTRO_CHAT_AGENT_ID, MAESTRO_CHAT_CONFIDENCE } from "@/lib/maestro/trust-rules";
import type { MaestroToolDef } from "./types";
import { parseInput } from "./_task-helpers";

const inputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  context: z.string().trim().max(5000).optional(),
  kind: decisionKindEnum,
  severity: decisionSeverityEnum,
  projectSlug: z.string().optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
});

export const registarDecisaoTool: MaestroToolDef = {
  name: "registar_decisao",
  description:
    "Cria uma nova Decision (item operacional que precisa de ser fechado). Use quando o utilizador descreve algo que precisa de decisão/acção (ex: 'cliente X não responde há 5 dias', 'budget Y a estourar').",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Título curto (3-200 chars)." },
      context: { type: "string", description: "Contexto livre (max 5000 chars)." },
      kind: {
        type: "string",
        enum: [...decisionKindEnum.options],
        description: "Tipo: pipeline_stall, client_reply, bruno_block, budget, feedback_triage, other.",
      },
      severity: {
        type: "string",
        enum: [...decisionSeverityEnum.options],
        description: "block (urgente) | warn (atenção) | pend (a observar).",
      },
      projectSlug: { type: "string", description: "Projecto associado (opcional)." },
      dueAt: { type: "string", description: "Prazo ISO 8601 com offset (opcional)." },
    },
    required: ["title", "kind", "severity"],
  },
  async execute(rawInput) {
    const input = parseInput(inputSchema, rawInput);
    if (!input.ok) return input;

    const db = await getTenantDb();
    const [resolvedProject, gating] = await Promise.all([
      input.data.projectSlug ? resolveProjectSlug(db, input.data.projectSlug) : null,
      gateAgentWrite({
        agentId: MAESTRO_CHAT_AGENT_ID,
        extractionType: "decisao",
        confidence: MAESTRO_CHAT_CONFIDENCE,
      }),
    ]);

    if (input.data.projectSlug && !resolvedProject) {
      return {
        ok: false,
        error: `Projecto '${input.data.projectSlug}' não encontrado.`,
      };
    }

    const decision = await db.decision.create({
      data: {
        // tenantId é injectado pelo middleware tenantPrisma; "" é placeholder
        // para satisfazer o type checker (mesmo padrão de createDecision action).
        tenantId: "",
        title: input.data.title,
        context: input.data.context ?? null,
        kind: input.data.kind,
        severity: input.data.severity,
        projectId: resolvedProject?.projectId ?? null,
        dueAt: input.data.dueAt ? new Date(input.data.dueAt) : null,
      },
      select: { id: true, title: true },
    });
    revalidatePath("/");

    return {
      ok: true,
      data: {
        id: decision.id,
        titulo: decision.title,
        gating: gating.type,
        score: gating.score,
      },
      display: `📌 Decision "${decision.title}" registada`,
    };
  },
};
