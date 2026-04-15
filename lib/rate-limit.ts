/**
 * In-memory sliding-window rate limiter.
 * Single-instance only — para multi-instance usar Redis/Upstash.
 *
 * Uso:
 *   const rl = checkRateLimit(`feedback:${userId}`, 20, 60_000);
 *   if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });
 */

type Window = { timestamps: number[] };

const windows = new Map<string, Window>();

// Soft cap com eviction FIFO (ordem de inserção) — evita crescimento infinito.
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
  error?: string;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  let w = windows.get(key);
  if (!w) {
    if (windows.size >= MAX_KEYS) {
      // Eviction: apagar a chave mais velha (primeira no iterador da Map)
      const firstKey = windows.keys().next().value;
      if (firstKey) windows.delete(firstKey);
    }
    w = { timestamps: [] };
    windows.set(key, w);
  }

  w.timestamps = w.timestamps.filter((t) => t > cutoff);

  if (w.timestamps.length >= limit) {
    const oldest = w.timestamps[0]!;
    const resetMs = oldest + windowMs - now;
    return {
      ok: false,
      remaining: 0,
      resetMs,
      error: `Rate limit excedido: máx ${limit}/${Math.round(windowMs / 1000)}s. Tenta em ${Math.ceil(resetMs / 1000)}s.`,
    };
  }

  w.timestamps.push(now);
  return { ok: true, remaining: limit - w.timestamps.length, resetMs: windowMs };
}

/**
 * Devolve o IP do pedido (x-forwarded-for > request.ip fallback).
 * Apenas best-effort — em prod atrás de proxy confiança o header.
 */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/** Para testes — limpa o estado interno. */
export function _resetRateLimitForTests() {
  windows.clear();
}
