import "server-only";
import { z } from "zod";
import { getTenantDb } from "@/lib/tenant";
import { gateAgentWrite } from "@/lib/maestro/agent-gating";
import { MAESTRO_CHAT_AGENT_ID, MAESTRO_CHAT_CONFIDENCE } from "@/lib/maestro/trust-rules";
import type { MaestroToolDef } from "./types";

const inputSchema = z.object({
  emailId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
});

export const categorizarEmailTool: MaestroToolDef = {
  name: "categorizar_email",
  description:
    "Categoriza um email associando-o a projecto, cliente, ou pessoa. Passa pelo trust score.",
  inputSchema: {
    type: "object",
    properties: {
      emailId: { type: "string", description: "ID do email a categorizar. Obrigatório." },
      projectId: { type: "string", description: "ID do projecto." },
      clientId: { type: "string", description: "ID do cliente." },
      personId: { type: "string", description: "ID da pessoa." },
    },
    required: ["emailId"],
  },
  async execute(rawInput) {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) return { ok: false, error: "Input inválido" };
    const input = parsed.data;

    const db = await getTenantDb();
    const email = await db.emailRecord.findUnique({
      where: { id: input.emailId },
      select: { id: true, subject: true, validationStatus: true },
    });
    if (!email) return { ok: false, error: "Email não encontrado" };

    await gateAgentWrite({
      agentId: MAESTRO_CHAT_AGENT_ID,
      extractionType: "ligacao_codigo",
      confidence: MAESTRO_CHAT_CONFIDENCE,
    });

    await db.emailRecord.update({
      where: { id: input.emailId },
      data: {
        projectId: input.projectId ?? undefined,
        clientId: input.clientId ?? undefined,
        personId: input.personId ?? undefined,
        isProcessed: true,
        validationStatus: "confirmado",
        categorizationMethod: "maestro",
      },
    });

    return {
      ok: true,
      data: { emailId: input.emailId },
      display: `Email "${email.subject}" categorizado`,
    };
  },
};
