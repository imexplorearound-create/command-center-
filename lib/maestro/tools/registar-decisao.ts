import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant";
import { decisionKindEnum, decisionSeverityEnum } from "@/lib/validation/decision-schema";
import { resolveProjectSlug } from "@/lib/agent-helpers";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  context: z.string().trim().max(5000).optional(),
  kind: decisionKindEnum,
  severity: decisionSeverityEnum,
  projectSlug: z.string().optional(),
  dueAt: z.string().optional(), // ISO 8601 com timezone
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
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        error: `Input inválido: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }

    const db = await getTenantDb();
    let projectId: string | null = null;
    if (parsed.data.projectSlug) {
      const resolved = await resolveProjectSlug(db, parsed.data.projectSlug);
      if (!resolved) {
        return {
          ok: false,
          error: `Projecto '${parsed.data.projectSlug}' não encontrado.`,
        };
      }
      projectId = resolved.projectId;
    }

    const dueAt = parsed.data.dueAt ? new Date(parsed.data.dueAt) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      return { ok: false, error: "dueAt inválido (esperava ISO 8601 com offset)." };
    }

    const decision = await db.decision.create({
      data: {
        // tenantId é injectado pelo middleware tenantPrisma; "" é placeholder
        // para satisfazer o type checker (mesmo padrão de createDecision action).
        tenantId: "",
        title: parsed.data.title,
        context: parsed.data.context ?? null,
        kind: parsed.data.kind,
        severity: parsed.data.severity,
        projectId,
        dueAt,
      },
      select: { id: true, title: true },
    });
    revalidatePath("/");

    return {
      ok: true,
      data: { id: decision.id, titulo: decision.title },
      display: `📌 Decision "${decision.title}" registada`,
    };
  },
};
