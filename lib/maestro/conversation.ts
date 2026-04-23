import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { Prisma } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { HISTORY_WINDOW } from "./client";

export interface PersistedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: unknown;
  toolResults: unknown;
  createdAt: Date;
}

export async function loadOrCreateConversation(
  ownerId: string,
  conversationId: string | null
): Promise<{ id: string; messages: PersistedMessage[]; isNew: boolean }> {
  const db = await getTenantDb();
  if (conversationId) {
    const conv = await db.maestroConversation.findFirst({
      where: { id: conversationId, ownerId, archivedAt: null },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: HISTORY_WINDOW,
        },
      },
    });
    if (conv) {
      return {
        id: conv.id,
        messages: conv.messages
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            toolCalls: m.toolCalls,
            toolResults: m.toolResults,
            createdAt: m.createdAt,
          }))
          .reverse(),
        isNew: false,
      };
    }
  }

  const created = await db.maestroConversation.create({
    data: { tenantId: "", ownerId },
    select: { id: true },
  });
  return { id: created.id, messages: [], isNew: true };
}

/**
 * Reconstrói a sequência tool_use → tool_result a partir das mensagens
 * persistidas — o SDK exige a forma original em blocks, não plain text.
 */
export function buildSdkMessages(
  history: PersistedMessage[],
  userMessage: string
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  for (const m of history) {
    if (m.role === "user") {
      messages.push({ role: "user", content: m.content });
      continue;
    }

    const blocks: Anthropic.ContentBlockParam[] = [];
    if (m.content) blocks.push({ type: "text", text: m.content });
    if (Array.isArray(m.toolCalls)) {
      for (const tc of m.toolCalls as Array<{ id: string; name: string; input: unknown }>) {
        blocks.push({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: tc.input as Record<string, unknown>,
        });
      }
    }
    if (blocks.length > 0) messages.push({ role: "assistant", content: blocks });

    if (Array.isArray(m.toolResults) && m.toolResults.length > 0) {
      const resultBlocks: Anthropic.ContentBlockParam[] = (
        m.toolResults as Array<{ tool_use_id: string; content: string }>
      ).map((tr) => ({
        type: "tool_result",
        tool_use_id: tr.tool_use_id,
        content: tr.content,
      }));
      messages.push({ role: "user", content: resultBlocks });
    }
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

interface PersistTurnInput {
  conversationId: string;
  userMessage: string;
  assistantText: string;
  toolCalls: Array<{ id: string; name: string; input: unknown }>;
  toolResults: Array<{ tool_use_id: string; content: string }>;
  /** True quando esta é a primeira mensagem da conversa — usado para definir o título. */
  setTitle: boolean;
}

/**
 * LIMITAÇÃO: turnos com múltiplas rondas de tool use são achatados num único
 * registo `assistant` (texto concatenado + todos os tool_use juntos + todos os
 * tool_result juntos). Para conversas que dependem de tool calls sequenciais
 * encadeadas, partir esta função em rows-por-ronda. Para Sprint 5 é suficiente.
 */
export async function persistTurn(input: PersistTurnInput) {
  const db = await getTenantDb();
  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.maestroMessage.create({
      data: {
        tenantId: "",
        conversationId: input.conversationId,
        role: "user",
        content: input.userMessage,
      },
    }),
    db.maestroMessage.create({
      data: {
        tenantId: "",
        conversationId: input.conversationId,
        role: "assistant",
        content: input.assistantText,
        toolCalls:
          input.toolCalls.length > 0
            ? (input.toolCalls as Prisma.InputJsonArray)
            : undefined,
        toolResults:
          input.toolResults.length > 0
            ? (input.toolResults as Prisma.InputJsonArray)
            : undefined,
      },
    }),
    db.maestroConversation.update({
      where: { id: input.conversationId },
      data: input.setTitle
        ? {
            updatedAt: new Date(),
            title:
              input.userMessage.length > 60
                ? `${input.userMessage.slice(0, 57)}...`
                : input.userMessage,
          }
        : { updatedAt: new Date() },
    }),
  ];

  await db.$transaction(ops);
}
