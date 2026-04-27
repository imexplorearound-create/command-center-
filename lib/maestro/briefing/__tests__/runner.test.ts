import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { mockTenantDb, mockNotifyUser, mockGenerate, mockTenantPrisma, mockCollectData } =
  vi.hoisted(() => {
    const tenantDb = {
      maestroBriefing: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
    };
    return {
      mockTenantDb: tenantDb,
      mockNotifyUser: vi.fn().mockResolvedValue(undefined),
      mockGenerate: vi.fn(),
      mockCollectData: vi.fn(),
      mockTenantPrisma: vi.fn(() => tenantDb),
    };
  });

vi.mock("@/lib/db", () => ({
  tenantPrisma: mockTenantPrisma,
}));
vi.mock("@/lib/notifications", () => ({ notifyUser: mockNotifyUser }));
vi.mock("../generator", () => ({ generateBriefingMarkdown: mockGenerate }));
vi.mock("../data-collector", () => ({
  collectBriefingData: mockCollectData,
  isBriefingDataEmpty: (data: { _empty: boolean }) => data._empty === true,
}));

import { runBriefingForUser, resolveBriefingChannel, toLocalDate } from "../runner";

const tenant = {
  id: "t1",
  name: "Demo",
  locale: "pt-PT",
  timezone: "Europe/Lisbon",
};

const baseUser = {
  id: "u1",
  role: "admin",
  email: "miguel@example.com",
  telegramChatId: null,
  whatsappPhoneId: null,
  notificationPrefs: { channels: ["email"] },
  person: { id: "p1", name: "Miguel" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockTenantDb.maestroBriefing.findUnique.mockResolvedValue(null);
  mockTenantDb.maestroBriefing.upsert.mockResolvedValue({ id: "b-new" });
  mockTenantDb.maestroBriefing.update.mockResolvedValue({});
});

describe("runBriefingForUser — idempotência", () => {
  it("skip se já entregue hoje e force:false", async () => {
    mockTenantDb.maestroBriefing.findUnique.mockResolvedValue({
      id: "b-existing",
      status: "delivered",
      deliveredAt: new Date(),
    });

    const r = await runBriefingForUser(tenant, baseUser);
    expect(r.status).toBe("skipped_existing");
    expect(r.briefingId).toBe("b-existing");
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockNotifyUser).not.toHaveBeenCalled();
  });

  it("regera quando force:true mesmo já entregue", async () => {
    mockTenantDb.maestroBriefing.findUnique.mockResolvedValue({
      id: "b-existing",
      status: "delivered",
      deliveredAt: new Date(),
    });
    mockCollectData.mockResolvedValue({ _empty: false });
    mockGenerate.mockResolvedValue({
      content: "## Briefing", model: "test", usageInput: 100, usageOutput: 50,
    });

    const r = await runBriefingForUser(tenant, baseUser, { force: true });
    expect(r.status).toBe("delivered");
    expect(mockGenerate).toHaveBeenCalled();
    expect(mockNotifyUser).toHaveBeenCalledWith("u1", expect.objectContaining({
      type: "maestro_briefing",
    }));
  });
});

describe("runBriefingForUser — paths", () => {
  it("dados vazios → status skipped_empty, sem LLM, sem notify", async () => {
    mockCollectData.mockResolvedValue({ _empty: true });

    const r = await runBriefingForUser(tenant, baseUser);
    expect(r.status).toBe("skipped_empty");
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockNotifyUser).not.toHaveBeenCalled();
    expect(mockTenantDb.maestroBriefing.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "skipped_empty" }),
      }),
    );
  });

  it("LLM falha → status failed, sem notify, errorMessage preenchido", async () => {
    mockCollectData.mockResolvedValue({ _empty: false });
    mockGenerate.mockRejectedValue(new Error("MiniMax 500"));

    const r = await runBriefingForUser(tenant, baseUser);
    expect(r.status).toBe("failed");
    expect(r.error).toContain("MiniMax 500");
    expect(mockNotifyUser).not.toHaveBeenCalled();
    expect(mockTenantDb.maestroBriefing.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "failed", errorMessage: "MiniMax 500" }),
      }),
    );
  });

  it("happy path → notify primeiro, depois upsert directamente como delivered", async () => {
    mockCollectData.mockResolvedValue({ _empty: false });
    mockGenerate.mockResolvedValue({
      content: "# Olá Miguel\n- algo",
      model: "test-model",
      usageInput: 200,
      usageOutput: 80,
    });

    const r = await runBriefingForUser(tenant, baseUser);
    expect(r.status).toBe("delivered");
    expect(r.channel).toBe("email");
    expect(mockNotifyUser).toHaveBeenCalled();
    expect(mockTenantDb.maestroBriefing.upsert).toHaveBeenCalledTimes(1);
    expect(mockTenantDb.maestroBriefing.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: "delivered",
          channel: "email",
          llmModel: "test-model",
          llmUsageInput: 200,
          llmUsageOutput: 80,
        }),
      }),
    );
    expect(mockTenantDb.maestroBriefing.update).not.toHaveBeenCalled();
  });

  it("user sem canal real → channel=inapp, sem notifyUser", async () => {
    mockCollectData.mockResolvedValue({ _empty: false });
    mockGenerate.mockResolvedValue({
      content: "x", model: "m", usageInput: 0, usageOutput: 0,
    });

    const noChannelUser = { ...baseUser, email: "" };
    const r = await runBriefingForUser(tenant, noChannelUser);
    expect(r.channel).toBe("inapp");
    expect(mockNotifyUser).not.toHaveBeenCalled();
  });

  it("user sem person → status failed", async () => {
    const orphan = { ...baseUser, person: null };
    const r = await runBriefingForUser(tenant, orphan);
    expect(r.status).toBe("failed");
    expect(r.error).toMatch(/Person/);
  });
});

describe("resolveBriefingChannel", () => {
  it("respeita canal explícito quando o user tem identificador", () => {
    const u = {
      ...baseUser,
      telegramChatId: "123",
      notificationPrefs: { briefing: { channel: "telegram" } },
    };
    expect(resolveBriefingChannel(u)).toBe("telegram");
  });

  it("ignora canal explícito sem identificador e usa fallback", () => {
    const u = {
      ...baseUser,
      telegramChatId: null,
      notificationPrefs: { briefing: { channel: "telegram" } },
    };
    expect(resolveBriefingChannel(u)).toBe("email");
  });

  it("inapp quando user não tem nenhum canal", () => {
    const u = { ...baseUser, email: "", telegramChatId: null, whatsappPhoneId: null };
    expect(resolveBriefingChannel(u)).toBe("inapp");
  });
});

describe("toLocalDate", () => {
  it("devolve a data calendário no fuso indicado", () => {
    const lisbon = toLocalDate(new Date("2026-04-27T22:30:00Z"), "Europe/Lisbon");
    expect(lisbon.toISOString().slice(0, 10)).toBe("2026-04-27");

    const sydney = toLocalDate(new Date("2026-04-27T22:30:00Z"), "Australia/Sydney");
    expect(sydney.toISOString().slice(0, 10)).toBe("2026-04-28");
  });

  it("fuso inválido → fallback para UTC", () => {
    const fallback = toLocalDate(new Date("2026-04-27T01:00:00Z"), "Foo/Bar");
    expect(fallback.toISOString().slice(0, 10)).toBe("2026-04-27");
  });
});
