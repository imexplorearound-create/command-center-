import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { requireWriter } from "@/lib/auth/dal";
import { MAX_TOOL_CALLS_PER_TURN } from "@/lib/maestro/client";
import { getLLMForTenant } from "@/lib/maestro/gateway";
import { buildSystemPrompt } from "@/lib/maestro/system-prompt";
import { getToolsForTenant, getToolsForAPI, findTool, type MaestroToolContext } from "@/lib/maestro/tools";
import { getTenantDb } from "@/lib/tenant";
import {
  loadOrCreateConversation,
  buildSdkMessages,
  persistTurn,
} from "@/lib/maestro/conversation";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface ChatBody {
  conversationId?: string | null;
  message: string;
}

interface ToolCallRecord {
  id: string;
  name: string;
  input: unknown;
}

interface ToolResultRecord {
  tool_use_id: string;
  content: string;
}

async function executeToolCall(
  toolUse: Anthropic.ToolUseBlock,
  ctx: MaestroToolContext
): Promise<{
  resultPayload: string;
  ok: boolean;
  display: string;
}> {
  const tool = findTool(toolUse.name);
  if (!tool) {
    return {
      resultPayload: JSON.stringify({ ok: false, error: `Tool desconhecida: ${toolUse.name}` }),
      ok: false,
      display: "tool desconhecida",
    };
  }
  try {
    const result = await tool.execute(toolUse.input, ctx);
    return {
      resultPayload: JSON.stringify(result),
      ok: result.ok,
      display: result.display ?? (result.ok ? "ok" : result.error ?? "erro"),
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "erro desconhecido";
    return {
      resultPayload: JSON.stringify({ ok: false, error: errorMsg }),
      ok: false,
      display: errorMsg,
    };
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireWriter();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  // Rate limit: 30 mensagens/min por user (evita abuso + custos LLM descontrolados)
  const rl = checkRateLimit(`maestro-chat:${auth.user.userId}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  let body: ChatBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json({ error: "message obrigatório" }, { status: 400 });
  }

  const { id: conversationId, messages: history, isNew } = await loadOrCreateConversation(
    auth.user.personId,
    body.conversationId ?? null
  );

  const sdkMessages = buildSdkMessages(history, body.message);
  const ctx: MaestroToolContext = {
    userId: auth.user.userId,
    personId: auth.user.personId,
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      let finalText = "";
      const allToolCalls: ToolCallRecord[] = [];
      const allToolResults: ToolResultRecord[] = [];
      let toolCallCount = 0;

      try {
        send("meta", { conversationId });

        // Resolve tenant modules for dynamic tools + prompt
        const db = await getTenantDb();
        const moduleConfigs = await db.tenantModuleConfig.findMany({
          where: { isEnabled: true },
          select: { moduleKey: true },
        });
        const enabledModules = moduleConfigs.map((mc) => mc.moduleKey);
        const tenantTools = getToolsForTenant(enabledModules);
        const tenantToolsAPI = getToolsForAPI(enabledModules);
        const locale = "pt-PT"; // Could resolve from session
        const systemPrompt = buildSystemPrompt(locale, enabledModules, tenantTools);

        const { provider: llm, model: llmModel } = await getLLMForTenant(auth.user.tenantId);
        const messages = [...sdkMessages];

        while (true) {
          const apiStream = llm.createStream({
            model: llmModel,
            max_tokens: 2048,
            system: systemPrompt,
            tools: tenantToolsAPI,
            messages,
          });

          for await (const event of apiStream) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                send("tool_start", {
                  id: event.content_block.id,
                  name: event.content_block.name,
                });
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                send("delta", { text: event.delta.text });
              }
            }
          }

          const finalMessage: Anthropic.Message = await apiStream.finalMessage();

          for (const block of finalMessage.content) {
            if (block.type === "text") finalText += block.text;
          }

          const toolUses = finalMessage.content.filter(
            (b: Anthropic.ContentBlock): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );

          if (toolUses.length === 0 || finalMessage.stop_reason !== "tool_use") {
            break;
          }

          // Cap tool calls before executing — slice the batch if it would overflow
          const remaining = MAX_TOOL_CALLS_PER_TURN - toolCallCount;
          const batch = toolUses.slice(0, Math.max(0, remaining));
          toolCallCount += batch.length;

          // Tools can run concurrently — they're all read-only or independent writes
          const results = await Promise.all(batch.map((tu: Anthropic.ToolUseBlock) => executeToolCall(tu, ctx)));

          const toolResultBlocks: Anthropic.ContentBlockParam[] = [];
          batch.forEach((toolUse: Anthropic.ToolUseBlock, i: number) => {
            const r = results[i];
            allToolCalls.push({
              id: toolUse.id,
              name: toolUse.name,
              input: toolUse.input,
            });
            allToolResults.push({
              tool_use_id: toolUse.id,
              content: r.resultPayload,
            });
            toolResultBlocks.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: r.resultPayload,
            });
            send("tool_result", { id: toolUse.id, ok: r.ok, display: r.display });
          });

          if (toolUses.length > batch.length) {
            const msg = `Limite de ${MAX_TOOL_CALLS_PER_TURN} tool calls por turno atingido.`;
            send("error", { message: msg });
            finalText += `\n\n[${msg}]`;
            break;
          }

          messages.push({ role: "assistant", content: finalMessage.content });
          messages.push({ role: "user", content: toolResultBlocks });
        }

        await persistTurn({
          conversationId,
          userMessage: body.message,
          assistantText: finalText,
          toolCalls: allToolCalls,
          toolResults: allToolResults,
          setTitle: isNew,
        });

        send("done", { conversationId });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
