import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit, _resetRateLimitForTests } from "../rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetRateLimitForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite até ao limite dentro da janela", () => {
    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit("k", 5, 60_000);
      expect(r.ok).toBe(true);
    }
    const r6 = checkRateLimit("k", 5, 60_000);
    expect(r6.ok).toBe(false);
    expect(r6.error).toMatch(/Rate limit/);
  });

  it("desbloqueia após a janela expirar", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("k", 3, 1000);
    expect(checkRateLimit("k", 3, 1000).ok).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(checkRateLimit("k", 3, 1000).ok).toBe(true);
  });

  it("chaves distintas têm contadores independentes", () => {
    checkRateLimit("a", 1, 60_000);
    checkRateLimit("a", 1, 60_000);
    expect(checkRateLimit("a", 1, 60_000).ok).toBe(false);
    expect(checkRateLimit("b", 1, 60_000).ok).toBe(true);
  });
});
