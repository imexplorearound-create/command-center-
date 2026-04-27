import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  decisionId: z.string().uuid(),
  resolutionNote: z.string().max(1000).optional(),
});

export const resolverDecisaoTool: MaestroToolDef = {
  name: "resolver_decisao",
  description:
    "Marca uma Decision como resolvida (resolvedAt=agora, resolutionSource='human'). Aceita nota opcional. Não reverte — para reabrir, usa o ecrã de Decisions.",
  inputSchema: {
    type: "object",
    properties: {
      decisionId: { type: "string", description: "UUID da Decision." },
      resolutionNote: {
        type: "string",
        description: "Nota explicativa da resolução (opcional, max 1000 chars).",
      },
    },
    required: ["decisionId"],
  },
  async execute(rawInput, ctx) {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        error: `Input inválido: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }

    const db = await getTenantDb();
    const existing = await db.decision.findUnique({
      where: { id: parsed.data.decisionId },
      select: { id: true, title: true, resolvedAt: true },
    });
    if (!existing) return { ok: false, error: "Decision não encontrada." };
    if (existing.resolvedAt) {
      return { ok: false, error: `Decision "${existing.title}" já está resolvida.` };
    }

    await db.decision.update({
      where: { id: existing.id },
      data: {
        resolvedAt: new Date(),
        resolvedById: ctx.personId,
        resolutionNote: parsed.data.resolutionNote ?? null,
        resolutionSource: "human",
      },
    });
    revalidatePath("/");

    return {
      ok: true,
      data: { id: existing.id, titulo: existing.title },
      display: `✓ Decision "${existing.title}" resolvida`,
    };
  },
};
