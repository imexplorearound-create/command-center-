import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import { decisionKindEnum, decisionSeverityEnum } from "@/lib/validation/decision-schema";
import { resolveProjectSlug } from "@/lib/agent-helpers";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  projectSlug: z.string().optional(),
  kind: decisionKindEnum.optional(),
  severity: decisionSeverityEnum.optional(),
  includeSnoozed: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const listarDecisoesTool: MaestroToolDef = {
  name: "listar_decisoes",
  description:
    "Lista Decisions abertas (não resolvidas) com filtros opcionais. Por defeito esconde as snoozed ainda em janela. Use para perguntas como 'que decisões tenho pendentes?' ou 'mostra-me os blocks no Aura'.",
  inputSchema: {
    type: "object",
    properties: {
      projectSlug: { type: "string", description: "Slug do projecto." },
      kind: {
        type: "string",
        enum: [...decisionKindEnum.options],
        description: "Filtra por tipo (pipeline_stall, client_reply, etc.).",
      },
      severity: {
        type: "string",
        enum: [...decisionSeverityEnum.options],
        description: "Filtra por severidade (block | warn | pend).",
      },
      includeSnoozed: {
        type: "boolean",
        description: "Se true, inclui as que estão snoozed até uma data futura. Default false.",
      },
      limit: { type: "number", description: "Máximo (default 20)." },
    },
    required: [],
  },
  async execute(rawInput) {
    const parsed = inputSchema.safeParse(rawInput ?? {});
    if (!parsed.success) return { ok: false, error: "Input inválido para listar_decisoes" };

    const db = await getTenantDb();
    const where: Record<string, unknown> = {
      resolvedAt: null,
      reopenedById: null,
    };

    if (!parsed.data.includeSnoozed) {
      where.OR = [
        { snoozedUntil: null },
        { snoozedUntil: { lte: new Date() } },
      ];
    }
    if (parsed.data.kind) where.kind = parsed.data.kind;
    if (parsed.data.severity) where.severity = parsed.data.severity;
    if (parsed.data.projectSlug) {
      const resolved = await resolveProjectSlug(db, parsed.data.projectSlug);
      if (!resolved) {
        return {
          ok: false,
          error: `Projecto '${parsed.data.projectSlug}' não encontrado.`,
        };
      }
      where.projectId = resolved.projectId;
    }

    const decisions = await db.decision.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: parsed.data.limit ?? 20,
      include: {
        project: { select: { name: true, slug: true } },
        crewRole: { select: { slug: true } },
      },
    });

    return {
      ok: true,
      data: decisions.map((d) => ({
        id: d.id,
        titulo: d.title,
        kind: d.kind,
        severidade: d.severity,
        prioridade: d.priority,
        projecto: d.project?.name ?? null,
        projectoSlug: d.project?.slug ?? null,
        crewRoleSlug: d.crewRole?.slug ?? null,
        dueAt: d.dueAt?.toISOString() ?? null,
        snoozedUntil: d.snoozedUntil?.toISOString() ?? null,
      })),
      display: `${decisions.length} decisão(ões) abertas`,
    };
  },
};
