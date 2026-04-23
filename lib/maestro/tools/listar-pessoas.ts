import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  type: z.enum(["equipa", "cliente"]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const listarPessoasTool: MaestroToolDef = {
  name: "listar_pessoas",
  description:
    "Devolve pessoas não-arquivadas. Pode filtrar por tipo: 'equipa' (membros internos) ou 'cliente' (contactos externos). Sem filtro devolve as duas categorias.",
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["equipa", "cliente"],
        description: "Filtro opcional por tipo de pessoa.",
      },
      limit: {
        type: "number",
        description: "Máximo de pessoas a devolver (default 50).",
      },
    },
    required: [],
  },
  async execute(rawInput) {
    const parsed = inputSchema.safeParse(rawInput ?? {});
    if (!parsed.success) {
      return { ok: false, error: "Input inválido para listar_pessoas" };
    }

    const where: Record<string, unknown> = { archivedAt: null };
    if (parsed.data.type) where.type = parsed.data.type;

    const db = await getTenantDb();
    const people = await db.person.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
      take: parsed.data.limit ?? 50,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        type: true,
      },
    });

    return {
      ok: true,
      data: people.map((p) => ({
        id: p.id,
        nome: p.name,
        email: p.email,
        cargo: p.role,
        tipo: p.type,
      })),
      display: `${people.length} pessoa(s)`,
    };
  },
};
