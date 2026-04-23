/**
 * Groq Whisper transcription client.
 * Uses the Groq API (OpenAI-compatible) for fast audio transcription.
 */

import path from "node:path";
import { config as loadDotenv } from "dotenv";

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_MODEL = "whisper-large-v3";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB Groq limit
const TIMEOUT_MS = 30_000;

// Next.js doesn't override env vars from .env.local if they exist in shell
let envLoaded = false;
function ensureGroqEnv() {
  if (envLoaded) return;
  const envPath = path.resolve(process.cwd(), ".env.local");
  const parsed = loadDotenv({ path: envPath }).parsed;
  if (parsed?.GROQ_API_KEY) process.env.GROQ_API_KEY = parsed.GROQ_API_KEY;
  envLoaded = true;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<string> {
  ensureGroqEnv();
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  if (audioBuffer.length > MAX_AUDIO_SIZE) {
    throw new Error(`Audio exceeds 25MB limit (${Math.round(audioBuffer.length / 1024 / 1024)}MB)`);
  }

  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(audioBuffer)]), filename);
  formData.append("model", GROQ_MODEL);
  formData.append("language", "pt");
  formData.append("response_format", "text");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    });

    const responseText = await res.text();

    if (!res.ok) {
      throw new Error(`Groq transcription failed (${res.status}): ${responseText}`);
    }

    return responseText.trim();
  } finally {
    clearTimeout(timeout);
  }
}
