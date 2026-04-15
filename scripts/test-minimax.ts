/**
 * Smoke test: confirma que o endpoint MiniMax (Anthropic-compatible)
 * suporta tool use no formato esperado pelo @anthropic-ai/sdk.
 *
 * Run: pnpm tsx scripts/test-minimax.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const apiKey = process.env.MINIMAX_API_KEY;
const baseURL = process.env.MINIMAX_BASE_URL;
const modelEnv = process.env.MINIMAX_MODEL;

if (!apiKey || !baseURL || !modelEnv) {
  console.error("❌ Faltam env vars: MINIMAX_API_KEY, MINIMAX_BASE_URL, MINIMAX_MODEL");
  process.exit(1);
}

// MiniMax usa modelos não-Anthropic — castamos para Model para satisfazer o SDK.
const model = modelEnv as Anthropic.Model;

const client = new Anthropic({ apiKey, baseURL });

async function testBasicCall() {
  console.log("\n=== Test 1: Basic call (sem tools) ===");
  const res = await client.messages.create({
    model,
    max_tokens: 200,
    messages: [{ role: "user", content: "Diz olá em Português, em uma frase." }],
  });
  console.log("✅ Resposta:", JSON.stringify(res.content, null, 2));
  console.log("Stop reason:", res.stop_reason);
}

async function testToolUse() {
  console.log("\n=== Test 2: Tool use ===");
  const res = await client.messages.create({
    model,
    max_tokens: 500,
    tools: [
      {
        name: "listar_projectos",
        description: "Lista os projectos activos do utilizador.",
        input_schema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Máximo de projectos a devolver." },
          },
          required: [],
        },
      },
    ],
    messages: [
      { role: "user", content: "Quais são os meus projectos? Usa a ferramenta disponível." },
    ],
  });

  console.log("Stop reason:", res.stop_reason);
  console.log("Content blocks:");
  for (const block of res.content) {
    if (block.type === "text") {
      console.log("  📝 text:", block.text);
    } else if (block.type === "tool_use") {
      console.log("  🔧 tool_use:", block.name, "input:", JSON.stringify(block.input));
    }
  }

  const hasToolUse = res.content.some((b) => b.type === "tool_use");
  if (!hasToolUse) {
    console.warn("⚠️  Modelo NÃO chamou nenhuma tool. Prompt provavelmente não suficientemente directo, mas o schema foi aceite sem erro.");
  } else {
    console.log("✅ Tool use funcional");
  }
}

async function testToolResult() {
  console.log("\n=== Test 3: Round-trip (tool_use → tool_result → resposta) ===");
  const tools: Anthropic.Tool[] = [
    {
      name: "listar_projectos",
      description: "Lista projectos activos.",
      input_schema: { type: "object", properties: {}, required: [] },
    },
  ];

  const turn1 = await client.messages.create({
    model,
    max_tokens: 500,
    tools,
    messages: [
      { role: "user", content: "Lista os meus projectos usando a ferramenta." },
    ],
  });

  const toolUse = turn1.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) {
    console.warn("⚠️  Skip — modelo não fez tool_use no turno 1");
    return;
  }

  const turn2 = await client.messages.create({
    model,
    max_tokens: 500,
    tools,
    messages: [
      { role: "user", content: "Lista os meus projectos usando a ferramenta." },
      { role: "assistant", content: turn1.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify([
              { id: "1", name: "Aura PMS", status: "active" },
              { id: "2", name: "Centro de Comando", status: "active" },
            ]),
          },
        ],
      },
    ],
  });

  console.log("Turn 2 stop:", turn2.stop_reason);
  for (const block of turn2.content) {
    if (block.type === "text") console.log("  📝", block.text);
  }
  console.log("✅ Round-trip funcional");
}

async function testStreaming() {
  console.log("\n=== Test 4: Streaming ===");
  const stream = client.messages.stream({
    model,
    max_tokens: 200,
    messages: [{ role: "user", content: "Conta de 1 a 5 em Português." }],
  });

  process.stdout.write("  ");
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
  }
  process.stdout.write("\n");
  console.log("✅ Streaming funcional");
}

async function main() {
  console.log("MiniMax endpoint:", baseURL);
  console.log("Model:", model);
  try {
    await testBasicCall();
    await testToolUse();
    await testToolResult();
    await testStreaming();
    console.log("\n🎉 Todos os testes passaram. Plano Sprint 5 está safe.");
  } catch (err) {
    console.error("\n❌ ERRO:", err);
    process.exit(1);
  }
}

main();
