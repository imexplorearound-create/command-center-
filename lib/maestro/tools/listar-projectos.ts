import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import { NOT_ARCHIVED } from "@/lib/queries";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});

export const listarProjectosTool: MaestroToolDef = {
  name: "listar_projectos",
  description:
    "Devolve a lista de projectos activos do Centro de Comando. Sem filtros — retorna todos. Use quando o utilizador quiser ver, escolher, ou referenciar projectos.",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Máximo de projectos a devolver (default 50).",
      },
    },
    required: [],
  },
  async execute(rawInput) {
    const parsed = inputSchema.safeParse(rawInput ?? {});
    if (!parsed.success) {
      return { ok: false, error: "Input inválido para listar_projectos" };
    }

    const db = await getTenantDb();
    const projects = await db.project.findMany({
      where: NOT_ARCHIVED,
      orderBy: { createdAt: "asc" },
      take: parsed.data.limit ?? 50,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        status: true,
        health: true,
        progress: true,
      },
    });

    return {
      ok: true,
      data: projects.map((p) => ({
        id: p.id,
        nome: p.name,
        slug: p.slug,
        tipo: p.type,
        status: p.status,
        saude: p.health,
        progresso: p.progress,
      })),
      display: `${projects.length} projecto(s) activo(s)`,
    };
  },
};
