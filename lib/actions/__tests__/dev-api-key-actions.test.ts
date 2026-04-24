import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";

const mocks = vi.hoisted(() => {
  const devApiKey = {
    create: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  };
  return {
    devApiKey,
    mockPrisma: { devApiKey },
    requireAdmin: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ basePrisma: mocks.mockPrisma }));
vi.mock("@/lib/auth/dal", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createDevApiKeyAction,
  revokeDevApiKeyAction,
  updateDevApiKeyLabelAction,
} from "../dev-api-key-actions";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
const TENANT_UUID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORIGINAL_PEPPER = process.env.DEV_API_KEY_PEPPER;

beforeAll(() => {
  process.env.DEV_API_KEY_PEPPER = "test-pepper";
});
afterAll(() => {
  process.env.DEV_API_KEY_PEPPER = ORIGINAL_PEPPER;
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({
    ok: true,
    user: { tenantId: TENANT_UUID, role: "admin" },
  });
});

describe("createDevApiKeyAction", () => {
  it("rejeita se caller não for admin", async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ ok: false, error: "Sem permissão" });
    const fd = new FormData();
    fd.set("label", "X");
    const r = await createDevApiKeyAction(undefined, fd);
    expect(r).toEqual({ error: "Sem permissão" });
    expect(mocks.devApiKey.create).not.toHaveBeenCalled();
  });

  it("cria chave com scopes e devolve token plaintext uma vez", async () => {
    mocks.devApiKey.create.mockResolvedValue({ id: VALID_UUID });
    const fd = new FormData();
    fd.set("label", "Bruno laptop");
    fd.append("scopes", "testsheets:write");
    fd.append("scopes", "tasks:read");

    const r = await createDevApiKeyAction(undefined, fd);

    expect(r).toMatchObject({
      success: true,
      data: { id: VALID_UUID },
    });
    if ("error" in r) throw new Error("should succeed");
    expect(r.data?.token).toMatch(/^cc_dev_[0-9a-f]{48}$/);
    expect(r.data?.prefix.length).toBe(16);

    const call = mocks.devApiKey.create.mock.calls[0]![0];
    expect(call.data.label).toBe("Bruno laptop");
    expect(call.data.tenantId).toBe(TENANT_UUID);
    expect(call.data.scopes).toEqual(["testsheets:write", "tasks:read"]);
    expect(call.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(call.data.tokenPrefix.length).toBe(16);
  });

  it("rejeita se sem scopes", async () => {
    const fd = new FormData();
    fd.set("label", "X");
    const r = await createDevApiKeyAction(undefined, fd);
    expect(r).toHaveProperty("error");
    expect(mocks.devApiKey.create).not.toHaveBeenCalled();
  });

  it("rejeita scope inválido", async () => {
    const fd = new FormData();
    fd.set("label", "X");
    fd.append("scopes", "testsheets:write");
    fd.append("scopes", "admin:all");
    const r = await createDevApiKeyAction(undefined, fd);
    expect(r).toHaveProperty("error");
    expect(mocks.devApiKey.create).not.toHaveBeenCalled();
  });

  it("aceita expiresAt opcional", async () => {
    mocks.devApiKey.create.mockResolvedValue({ id: VALID_UUID });
    const fd = new FormData();
    fd.set("label", "Chave temporária");
    fd.append("scopes", "tasks:read");
    fd.set("expiresAt", "2026-12-31T23:59:59+00:00");

    const r = await createDevApiKeyAction(undefined, fd);
    expect(r).toHaveProperty("success");
    const call = mocks.devApiKey.create.mock.calls[0]![0];
    expect(call.data.expiresAt).toBeInstanceOf(Date);
  });
});

describe("revokeDevApiKeyAction", () => {
  it("revoga se pertence ao tenant", async () => {
    mocks.devApiKey.updateMany.mockResolvedValue({ count: 1 });
    const fd = new FormData();
    fd.set("keyId", VALID_UUID);
    const r = await revokeDevApiKeyAction(undefined, fd);
    expect(r).toEqual({ success: true });
    const call = mocks.devApiKey.updateMany.mock.calls[0]![0];
    expect(call.where.tenantId).toBe(TENANT_UUID);
    expect(call.where.revokedAt).toBe(null);
    expect(call.data.revokedAt).toBeInstanceOf(Date);
  });

  it("devolve erro se não encontrou chave", async () => {
    mocks.devApiKey.updateMany.mockResolvedValue({ count: 0 });
    const fd = new FormData();
    fd.set("keyId", VALID_UUID);
    const r = await revokeDevApiKeyAction(undefined, fd);
    expect(r).toHaveProperty("error");
  });
});

describe("updateDevApiKeyLabelAction", () => {
  it("actualiza label", async () => {
    mocks.devApiKey.updateMany.mockResolvedValue({ count: 1 });
    const fd = new FormData();
    fd.set("keyId", VALID_UUID);
    fd.set("label", "Novo label");
    const r = await updateDevApiKeyLabelAction(undefined, fd);
    expect(r).toEqual({ success: true });
    const call = mocks.devApiKey.updateMany.mock.calls[0]![0];
    expect(call.data.label).toBe("Novo label");
  });
});
