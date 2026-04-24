import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateDevApiKey, hashDevApiKey } from "../dev-api-key";

const ORIGINAL_PEPPER = process.env.DEV_API_KEY_PEPPER;

beforeAll(() => {
  process.env.DEV_API_KEY_PEPPER = "test-pepper-0123456789";
});

afterAll(() => {
  process.env.DEV_API_KEY_PEPPER = ORIGINAL_PEPPER;
});

describe("generateDevApiKey", () => {
  it("produz token com prefixo cc_dev_ e 48 hex chars de secret (total 55)", () => {
    const { token } = generateDevApiKey();
    expect(token.startsWith("cc_dev_")).toBe(true);
    expect(token.length).toBe(7 + 48);
    expect(token.slice(7)).toMatch(/^[0-9a-f]{48}$/);
  });

  it("devolve prefix com 16 chars para display", () => {
    const { token, prefix } = generateDevApiKey();
    expect(prefix.length).toBe(16);
    expect(token.startsWith(prefix)).toBe(true);
  });

  it("duas chamadas produzem tokens diferentes", () => {
    const a = generateDevApiKey().token;
    const b = generateDevApiKey().token;
    expect(a).not.toBe(b);
  });
});

describe("hashDevApiKey", () => {
  it("é determinístico para o mesmo token + pepper", () => {
    const token = "cc_dev_abcdef";
    expect(hashDevApiKey(token)).toBe(hashDevApiKey(token));
  });

  it("depende do pepper (muda se pepper muda)", () => {
    const token = "cc_dev_abcdef";
    const h1 = hashDevApiKey(token);
    process.env.DEV_API_KEY_PEPPER = "other-pepper";
    const h2 = hashDevApiKey(token);
    expect(h1).not.toBe(h2);
    process.env.DEV_API_KEY_PEPPER = "test-pepper-0123456789";
  });

  it("lança se DEV_API_KEY_PEPPER não estiver definida", () => {
    process.env.DEV_API_KEY_PEPPER = "";
    expect(() => hashDevApiKey("cc_dev_x")).toThrow(/DEV_API_KEY_PEPPER/);
    process.env.DEV_API_KEY_PEPPER = "test-pepper-0123456789";
  });

  it("devolve 64 hex chars (SHA-256)", () => {
    const h = hashDevApiKey("cc_dev_abc");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
