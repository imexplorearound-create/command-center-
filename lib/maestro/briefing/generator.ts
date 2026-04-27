import "server-only";
import { getLLMForTenant } from "@/lib/maestro/gateway";
import type { BriefingData } from "./data-collector";
import { buildBriefingSystemPrompt, buildBriefingUserMessage } from "./prompt";

export interface GeneratedBriefing {
  content: string;
  model: string;
  usageInput: number;
  usageOutput: number;
}

export async function generateBriefingMarkdown(
  data: BriefingData,
): Promise<GeneratedBriefing> {
  const { provider, model } = await getLLMForTenant(data.tenant.id);
  const system = buildBriefingSystemPrompt(data.tenant.locale, data.tenant.name);
  const userMessage = buildBriefingUserMessage(data);

  const response = await provider.createMessage({
    model,
    max_tokens: 800,
    temperature: 0.3,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Briefing: LLM devolveu resposta vazia");
  }

  return {
    content: text,
    model: response.model || model,
    usageInput: response.usage?.input_tokens ?? 0,
    usageOutput: response.usage?.output_tokens ?? 0,
  };
}
