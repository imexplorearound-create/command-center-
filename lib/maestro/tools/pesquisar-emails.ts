import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(30).optional(),
});

export const pesquisarEmailsTool: MaestroToolDef = {
  name: "pesquisar_emails",
  description:
    "Pesquisa emails sincronizados. Pode filtrar por projecto, cliente, ou texto no assunto. Use quando o utilizador perguntar sobre emails ou comunicações.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "ID do projecto para filtrar." },
      clientId: { type: "string", description: "ID do cliente para filtrar." },
      search: { type: "string", description: "Texto para pesquisar no assunto." },
      limit: { type: "number", description: "Máximo de resultados (default 10)." },
    },
    required: [],
  },
  async execute(rawInput) {
    const parsed = inputSchema.safeParse(rawInput ?? {});
    if (!parsed.success) return { ok: false, error: "Input inválido" };

    const db = await getTenantDb();
    const where: Record<string, unknown> = {};
    if (parsed.data.projectId) where.projectId = parsed.data.projectId;
    if (parsed.data.clientId) where.clientId = parsed.data.clientId;
    if (parsed.data.search) where.subject = { contains: parsed.data.search, mode: "insensitive" };

    const emails = await db.emailRecord.findMany({
      where,
      include: {
        project: { select: { name: true } },
        client: { select: { companyName: true } },
      },
      orderBy: { receivedAt: "desc" },
      take: parsed.data.limit ?? 10,
    });

    return {
      ok: true,
      data: emails.map((e) => ({
        id: e.id,
        assunto: e.subject,
        de: e.from,
        data: e.receivedAt.toISOString().split("T")[0],
        direccao: e.direction,
        projecto: e.project?.name ?? null,
        cliente: e.client?.companyName ?? null,
        estado: e.validationStatus,
      })),
      display: `${emails.length} email(s)`,
    };
  },
};
