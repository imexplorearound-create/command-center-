import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("getEncryptionKey", () => {
  const origSecret = process.env.APP_SECRET;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.APP_SECRET = origSecret;
  });

  it("rejeita APP_SECRET em falta", async () => {
    delete process.env.APP_SECRET;
    const { getEncryptionKey } = await import("../env");
    expect(() => getEncryptionKey()).toThrow(/APP_SECRET/);
  });

  it("rejeita APP_SECRET curto (< 32 chars)", async () => {
    process.env.APP_SECRET = "short";
    const { getEncryptionKey } = await import("../env");
    expect(() => getEncryptionKey()).toThrow(/32 chars/);
  });

  it("aceita APP_SECRET com ≥ 32 chars e devolve Buffer de 32 bytes", async () => {
    process.env.APP_SECRET = "a".repeat(32);
    const { getEncryptionKey } = await import("../env");
    const key = getEncryptionKey();
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });
});
