import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});

export const listarClientesTool: MaestroToolDef = {
  name: "listar_clientes",
  description:
    "Devolve clientes e seus contactos. Use quando o utilizador perguntar sobre clientes, empresas, ou contactos comerciais.",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Máximo de resultados (default 30)" },
    },
    required: [],
  },
  async execute(rawInput) {
    const parsed = inputSchema.safeParse(rawInput ?? {});
    if (!parsed.success) return { ok: false, error: "Input inválido" };

    const db = await getTenantDb();
    const clients = await db.client.findMany({
      include: {
        contacts: { select: { person: { select: { name: true, email: true } }, isPrimary: true } },
      },
      take: parsed.data.limit ?? 30,
    });

    return {
      ok: true,
      data: clients.map((c) => ({
        id: c.id,
        empresa: c.companyName,
        status: c.status,
        contactos: c.contacts.map((ct) => ({
          nome: ct.person.name,
          email: ct.person.email,
          principal: ct.isPrimary,
        })),
      })),
      display: `${clients.length} cliente(s)`,
    };
  },
};
