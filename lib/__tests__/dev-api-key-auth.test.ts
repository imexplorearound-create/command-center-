import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";

const mocks = vi.hoisted(() => {
  const devApiKey = {
    findUnique: vi.fn(),
    update: vi.fn(() => ({ catch: () => {} })),
  };
  return {
    devApiKey,
    mockPrisma: { devApiKey },
    tenantPrisma: vi.fn(() => ({ __tenant: true })),
  };
});

vi.mock("@/lib/db", () => ({
  basePrisma: mocks.mockPrisma,
  tenantPrisma: mocks.tenantPrisma,
}));

import { authenticateDev, generateDevApiKey, hashDevApiKey } from "../dev-api-key";

const ORIGINAL_PEPPER = process.env.DEV_API_KEY_PEPPER;
const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

beforeAll(() => {
  process.env.DEV_API_KEY_PEPPER = "test-pepper";
});
afterAll(() => {
  process.env.DEV_API_KEY_PEPPER = ORIGINAL_PEPPER;
});

beforeEach(() => {
  vi.clearAllMocks();
});

function mockRequest(headers: Record<string, string>) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as Parameters<typeof authenticateDev>[0];
}

const validKey = {
  id: "key-1",
  tenantId: TENANT,
  personId: "person-1",
  scopes: ["testsheets:write", "tasks:read"],
  revokedAt: null,
  expiresAt: null,
  lastUsedAt: null,
};

describe("authenticateDev — header parsing", () => {
  it("rejeita sem Authorization header", async () => {
    const r = await authenticateDev(mockRequest({}));
    expect(r).toBeInstanceOf(Response);
    expect((r as Response).status).toBe(401);
  });

  it("rejeita Bearer malformado", async () => {
    const r = await authenticateDev(mockRequest({ authorization: "Token xyz" }));
    expect((r as Response).status).toBe(401);
  });

  it("rejeita token sem prefixo cc_dev_", async () => {
    const r = await authenticateDev(
      mockRequest({ authorization: "Bearer some-other-token" }),
    );
    expect((r as Response).status).toBe(401);
  });
});

describe("authenticateDev — validação de key", () => {
  it("rejeita token desconhecido (hash não bate)", async () => {
    mocks.devApiKey.findUnique.mockResolvedValue(null);
    const { token } = generateDevApiKey();
    const r = await authenticateDev(mockRequest({ authorization: `Bearer ${token}` }));
    expect((r as Response).status).toBe(401);
  });

  it("rejeita key revogada", async () => {
    mocks.devApiKey.findUnique.mockResolvedValue({
      ...validKey,
      revokedAt: new Date(),
    });
    const { token } = generateDevApiKey();
    const r = await authenticateDev(mockRequest({ authorization: `Bearer ${token}` }));
    expect((r as Response).status).toBe(401);
  });

  it("rejeita key expirada", async () => {
    mocks.devApiKey.findUnique.mockResolvedValue({
      ...validKey,
      expiresAt: new Date(Date.now() - 1000),
    });
    const { token } = generateDevApiKey();
    const r = await authenticateDev(mockRequest({ authorization: `Bearer ${token}` }));
    expect((r as Response).status).toBe(401);
  });

  it("aceita key válida e devolve context com tenantId+scopes", async () => {
    mocks.devApiKey.findUnique.mockResolvedValue(validKey);
    const { token } = generateDevApiKey();
    const r = await authenticateDev(mockRequest({ authorization: `Bearer ${token}` }));
    expect(r).toEqual({
      keyId: "key-1",
      tenantId: TENANT,
      personId: "person-1",
      scopes: ["testsheets:write", "tasks:read"],
    });
  });
});

describe("authenticateDev — scopes", () => {
  beforeEach(() => {
    mocks.devApiKey.findUnique.mockResolvedValue(validKey);
  });

  it("retorna 403 se scope necessário não está presente", async () => {
    const { token } = generateDevApiKey();
    const r = await authenticateDev(
      mockRequest({ authorization: `Bearer ${token}` }),
      { scopes: ["feedback:read"] },
    );
    expect((r as Response).status).toBe(403);
  });

  it("aceita se todos os scopes necessários estão presentes", async () => {
    const { token } = generateDevApiKey();
    const r = await authenticateDev(
      mockRequest({ authorization: `Bearer ${token}` }),
      { scopes: ["testsheets:write"] },
    );
    expect(r).not.toBeInstanceOf(Response);
    expect((r as { keyId: string }).keyId).toBe("key-1");
  });
});

describe("authenticateDev — lastUsedAt throttle", () => {
  it("actualiza lastUsedAt se > 60s desde última utilização", async () => {
    mocks.devApiKey.findUnique.mockResolvedValue({
      ...validKey,
      lastUsedAt: new Date(Date.now() - 61_000),
    });
    const { token } = generateDevApiKey();
    await authenticateDev(mockRequest({ authorization: `Bearer ${token}` }));
    expect(mocks.devApiKey.update).toHaveBeenCalledTimes(1);
  });

  it("não actualiza lastUsedAt se < 60s desde última utilização", async () => {
    mocks.devApiKey.findUnique.mockResolvedValue({
      ...validKey,
      lastUsedAt: new Date(Date.now() - 30_000),
    });
    const { token } = generateDevApiKey();
    await authenticateDev(mockRequest({ authorization: `Bearer ${token}` }));
    expect(mocks.devApiKey.update).not.toHaveBeenCalled();
  });

  it("actualiza lastUsedAt se nunca foi usada (lastUsedAt null)", async () => {
    mocks.devApiKey.findUnique.mockResolvedValue({ ...validKey, lastUsedAt: null });
    const { token } = generateDevApiKey();
    await authenticateDev(mockRequest({ authorization: `Bearer ${token}` }));
    expect(mocks.devApiKey.update).toHaveBeenCalledTimes(1);
  });
});

describe("hashDevApiKey", () => {
  it("determinístico dentro da mesma sessão", () => {
    expect(hashDevApiKey("cc_dev_xyz")).toBe(hashDevApiKey("cc_dev_xyz"));
  });
});
