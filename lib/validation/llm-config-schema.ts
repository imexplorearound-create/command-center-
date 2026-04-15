import { z } from "zod";

export const llmProviderEnum = z.enum([
  "minimax",
  "anthropic",
  "openai",
  "ollama",
  "custom",
]);
export type LLMProvider = z.infer<typeof llmProviderEnum>;

export const llmConfigSchema = z.object({
  provider: llmProviderEnum,
  endpoint: z.string().url().max(500).optional(),
  model: z.string().min(1).max(200),
  apiKey: z.string().max(500).optional(),
  maxTokens: z.number().int().min(256).max(32768).default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
});

export const LLM_PROVIDER_OPTIONS = [
  { value: "minimax", label: "MiniMax", needsEndpoint: true, needsApiKey: true },
  { value: "anthropic", label: "Anthropic (Claude)", needsEndpoint: false, needsApiKey: true },
  { value: "openai", label: "OpenAI (GPT)", needsEndpoint: false, needsApiKey: true },
  { value: "ollama", label: "Ollama (Local)", needsEndpoint: true, needsApiKey: false },
  { value: "custom", label: "Custom Endpoint", needsEndpoint: true, needsApiKey: true },
] as const;
