import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { signAssetUrl, verifyAssetToken } from "../handoff-auth";

const ORIGINAL_SECRET = process.env.HANDOFF_ASSET_SECRET;
const ORIGINAL_BASE = process.env.NEXT_PUBLIC_APP_URL;

beforeAll(() => {
  process.env.HANDOFF_ASSET_SECRET = "test-handoff-secret-0123456789abcdef";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3100";
});

afterAll(() => {
  process.env.HANDOFF_ASSET_SECRET = ORIGINAL_SECRET;
  process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_BASE;
});

function extractToken(url: string): string {
  const u = new URL(url);
  return u.searchParams.get("t") ?? "";
}

describe("handoff-auth", () => {
  it("signAssetUrl devolve URL com base URL + token", async () => {
    const url = await signAssetUrl("/feedback-screenshots/abc/xpto.jpg");
    expect(url.startsWith("http://localhost:3100/api/handoff-asset?t=")).toBe(true);
  });

  it("verifyAssetToken aceita token válido e devolve path", async () => {
    const path = "/feedback-screenshots/abc/xpto.jpg";
    const url = await signAssetUrl(path);
    const result = await verifyAssetToken(extractToken(url));
    expect(result).toEqual({ path });
  });

  it("verifyAssetToken rejeita token adulterado", async () => {
    const url = await signAssetUrl("/feedback-screenshots/abc/xpto.jpg");
    const tampered = extractToken(url).slice(0, -4) + "AAAA";
    const result = await verifyAssetToken(tampered);
    expect(result).toBe(null);
  });

  it("verifyAssetToken rejeita token expirado", async () => {
    const url = await signAssetUrl("/feedback-screenshots/abc/xpto.jpg", 1);
    await new Promise((r) => setTimeout(r, 1100));
    const result = await verifyAssetToken(extractToken(url));
    expect(result).toBe(null);
  });

  it("verifyAssetToken rejeita string lixo", async () => {
    expect(await verifyAssetToken("not-a-jwt")).toBe(null);
    expect(await verifyAssetToken("")).toBe(null);
  });
});
