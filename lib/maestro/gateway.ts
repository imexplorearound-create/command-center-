import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { basePrisma } from "@/lib/db";
import { getEncryptionKey } from "@/lib/env";
import { getMaestroClient, getMaestroModel } from "./client";

function decryptApiKey(encrypted: string): string {
  const [ivHex, tagHex, dataHex] = encrypted.split(":");
  if (!ivHex || !tagHex || !dataHex) return encrypted; // Not encrypted (legacy)
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(dataHex, "hex"), undefined, "utf8") + decipher.final("utf8");
}

// ─── Types ─────────────────────────────────────────────────

export interface LLMCreateParams {
  model: string;
  max_tokens: number;
  temperature?: number;
  system: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
}

export interface LLMProvider {
  createMessage(params: LLMCreateParams): Promise<Anthropic.Message>;
  createStream(params: LLMCreateParams): ReturnType<Anthropic["messages"]["stream"]>;
}

// ─── Anthropic-Compatible Provider (MiniMax, Anthropic, Custom) ─────

class AnthropicCompatibleProvider implements LLMProvider {
  private client: Anthropic;
  constructor(client: Anthropic) {
    this.client = client;
  }

  async createMessage(params: LLMCreateParams): Promise<Anthropic.Message> {
    return this.client.messages.create({
      model: params.model,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      system: params.system,
      messages: params.messages,
      tools: params.tools,
    });
  }

  createStream(params: LLMCreateParams) {
    return this.client.messages.stream({
      model: params.model,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      system: params.system,
      messages: params.messages,
      tools: params.tools,
    });
  }
}

// ─── OpenAI-Compatible Provider (OpenAI, Ollama) ────────────

class OpenAICompatibleProvider implements LLMProvider {
  private baseURL: string;
  private apiKey: string;
  private defaultModel: string;

  constructor(baseURL: string, apiKey: string, model: string) {
    this.baseURL = baseURL.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.defaultModel = model;
  }

  async createMessage(params: LLMCreateParams): Promise<Anthropic.Message> {
    const openaiMessages = this.toOpenAIMessages(params.system, params.messages);
    const tools = params.tools ? this.toOpenAITools(params.tools) : undefined;

    const res = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: params.model || this.defaultModel,
        messages: openaiMessages,
        max_tokens: params.max_tokens,
        temperature: params.temperature ?? 0.7,
        ...(tools ? { tools, tool_choice: "auto" } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI-compatible API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    return this.fromOpenAIResponse(data);
  }

  createStream(params: LLMCreateParams): ReturnType<Anthropic["messages"]["stream"]> {
    // For OpenAI-compatible providers, we do a non-streaming call and wrap it
    // as a "stream" that yields a single complete message.
    // Full SSE streaming would require more complex adaptation.
    const self = this;
    const messagePromise = self.createMessage(params);

    // Return a minimal stream-like object compatible with Anthropic SDK
    return {
      async *[Symbol.asyncIterator]() {
        const msg = await messagePromise;
        yield { type: "message_start" as const, message: msg };
        for (const block of msg.content) {
          if (block.type === "text") {
            yield { type: "content_block_delta" as const, delta: { type: "text_delta", text: block.text } };
          }
        }
        yield { type: "message_stop" as const };
      },
      // Provide finalMessage for compatibility
      finalMessage: () => messagePromise,
      on: () => { return {} as ReturnType<Anthropic["messages"]["stream"]>; },
      abort: () => {},
    } as unknown as ReturnType<Anthropic["messages"]["stream"]>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toOpenAIMessages(system: string, messages: Anthropic.MessageParam[]): any[] {
    const result: { role: string; content: string }[] = [
      { role: "system", content: system },
    ];
    for (const msg of messages) {
      const content = typeof msg.content === "string"
        ? msg.content
        : msg.content
            .filter((b) => b.type === "text")
            .map((b) => (b as Anthropic.TextBlock).text)
            .join("\n");
      result.push({ role: msg.role, content });
    }
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toOpenAITools(tools: Anthropic.Tool[]): any[] {
    return tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fromOpenAIResponse(data: any): Anthropic.Message {
    const choice = data.choices?.[0];
    const content: Anthropic.ContentBlock[] = [];

    if (choice?.message?.content) {
      content.push({ type: "text", text: choice.message.content, citations: [] } as Anthropic.TextBlock);
    }

    // Convert tool calls
    if (choice?.message?.tool_calls) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const tc of choice.message.tool_calls) {
        content.push({
          type: "tool_use",
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments || "{}"),
        } as Anthropic.ToolUseBlock);
      }
    }

    const stopReason = choice?.finish_reason === "tool_calls" ? "tool_use" : "end_turn";

    return {
      id: data.id || "openai-msg",
      type: "message",
      role: "assistant",
      content,
      model: data.model || "",
      stop_reason: stopReason,
      usage: {
        input_tokens: data.usage?.prompt_tokens ?? 0,
        output_tokens: data.usage?.completion_tokens ?? 0,
      },
    } as Anthropic.Message;
  }
}

// ─── Provider Cache + Resolution ────────────────────────────

// Cache with TTL (5 min) to avoid stale configs and unbounded growth
const CACHE_TTL_MS = 5 * 60 * 1000;
const providerCache = new Map<string, { provider: LLMProvider; model: string; expiresAt: number }>();
const pendingResolves = new Map<string, Promise<{ provider: LLMProvider; model: string }>>();
const DEFAULT_KEY = "__default__";

function createAnthropicClient(endpoint: string, apiKey: string): Anthropic {
  return new Anthropic({ apiKey, baseURL: endpoint });
}

async function resolveProviderConfig(tenantId: string) {
  return basePrisma.tenantLLMConfig.findUnique({
    where: { tenantId },
  });
}

export async function getLLMForTenant(tenantId?: string): Promise<{ provider: LLMProvider; model: string }> {
  const cacheKey = tenantId ?? DEFAULT_KEY;

  // Check cache with TTL
  const cached = providerCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { provider: cached.provider, model: cached.model };
  }

  // Coalesce concurrent misses — avoid duplicate DB reads
  const pending = pendingResolves.get(cacheKey);
  if (pending) return pending;

  const promise = (async () => {
    try {
      // Try tenant-specific config
      if (tenantId) {
        const config = await resolveProviderConfig(tenantId);
        if (config) {
          const apiKey = config.apiKeyEncrypted ? decryptApiKey(config.apiKeyEncrypted) : null;
          const result = buildProvider(config.provider, config.endpoint, apiKey, config.model);
          providerCache.set(cacheKey, { ...result, expiresAt: Date.now() + CACHE_TTL_MS });
          return result;
        }
      }

      // Fallback: default MiniMax
      const defaultProvider = new AnthropicCompatibleProvider(getMaestroClient());
      const defaultModel = getMaestroModel();
      const result = { provider: defaultProvider, model: defaultModel };
      providerCache.set(cacheKey, { ...result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    } finally {
      pendingResolves.delete(cacheKey);
    }
  })();

  pendingResolves.set(cacheKey, promise);
  return promise;
}

function buildProvider(
  providerType: string,
  endpoint: string | null,
  apiKey: string | null,
  model: string
): { provider: LLMProvider; model: string } {
  switch (providerType) {
    case "anthropic": {
      const client = new Anthropic({ apiKey: apiKey || "" });
      return {
        provider: new AnthropicCompatibleProvider(client),
        model: model === "default" ? "claude-sonnet-4-20250514" : model,
      };
    }

    case "minimax": {
      const client = createAnthropicClient(
        endpoint || process.env.MINIMAX_BASE_URL || "",
        apiKey || process.env.MINIMAX_API_KEY || ""
      );
      return {
        provider: new AnthropicCompatibleProvider(client),
        model: model === "default" ? getMaestroModel() : model,
      };
    }

    case "openai": {
      return {
        provider: new OpenAICompatibleProvider(
          endpoint || "https://api.openai.com",
          apiKey || "",
          model === "default" ? "gpt-4o" : model
        ),
        model: model === "default" ? "gpt-4o" : model,
      };
    }

    case "ollama": {
      return {
        provider: new OpenAICompatibleProvider(
          endpoint || "http://localhost:11434",
          "",
          model === "default" ? "llama3.1" : model
        ),
        model: model === "default" ? "llama3.1" : model,
      };
    }

    case "custom": {
      // Custom endpoint — assume OpenAI-compatible API
      return {
        provider: new OpenAICompatibleProvider(
          endpoint || "",
          apiKey || "",
          model
        ),
        model,
      };
    }

    default:
      throw new Error(`Unknown LLM provider: ${providerType}`);
  }
}

/** Clear cached provider for a tenant (after config change). */
export function invalidateLLMCache(tenantId: string) {
  providerCache.delete(tenantId);
}
