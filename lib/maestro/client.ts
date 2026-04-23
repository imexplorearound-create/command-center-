import "server-only";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;
let loaded = false;

/**
 * Carrega `.env.local` com override forçado APENAS para as MINIMAX_*.
 * Necessário porque o Next.js não sobrepõe env vars já existentes no shell —
 * se a sessão de shell tiver uma key antiga exportada (ex: do `~/.profile`),
 * ela tapa silenciosamente o `.env.local` e dá 401 em runtime. Esta função
 * garante que o `.env.local` é sempre a fonte de verdade para o Maestro.
 */
function ensureMaestroEnvLoaded() {
  if (loaded) return;
  const envPath = path.resolve(process.cwd(), ".env.local");
  const parsed = loadDotenv({ path: envPath }).parsed;
  if (parsed) {
    for (const key of ["MINIMAX_API_KEY", "MINIMAX_BASE_URL", "MINIMAX_MODEL"]) {
      if (parsed[key]) process.env[key] = parsed[key];
    }
  }
  loaded = true;
}

/**
 * Lazy-init: throw só quando alguém realmente faz uma chamada, para não
 * partir o build do Next ou os testes unitários sem env.
 */
export function getMaestroClient(): Anthropic {
  if (cached) return cached;
  ensureMaestroEnvLoaded();

  const apiKey = process.env.MINIMAX_API_KEY;
  const baseURL = process.env.MINIMAX_BASE_URL;

  if (!apiKey || !baseURL) {
    throw new Error(
      "Maestro: MINIMAX_API_KEY ou MINIMAX_BASE_URL não definidos no .env.local"
    );
  }

  cached = new Anthropic({ apiKey, baseURL });
  return cached;
}

export function getMaestroModel(): string {
  ensureMaestroEnvLoaded();
  return process.env.MINIMAX_MODEL ?? "MiniMax-M2.7-highspeed";
}

/** Mantido como export para compatibilidade — prefere `getMaestroModel()`. */
export const MAESTRO_MODEL = process.env.MINIMAX_MODEL ?? "MiniMax-M2.7-highspeed";

/** Limites de loop e contexto. */
export const MAX_TOOL_CALLS_PER_TURN = 5;
export const HISTORY_WINDOW = 20;
