import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { mockBasePrisma, mockTenantDb, mockTenantPrisma } = vi.hoisted(() => {
  const tenantDb = {
    user: { findMany: vi.fn() },
  };
  const base = {
    tenant: { findMany: vi.fn() },
  };
  return {
    mockBasePrisma: base,
    mockTenantDb: tenantDb,
    mockTenantPrisma: vi.fn(() => tenantDb),
  };
});

vi.mock("@/lib/db", () => ({
  basePrisma: mockBasePrisma,
  tenantPrisma: mockTenantPrisma,
}));

import { resolveBriefingTargets, currentHourInTimezone } from "../scheduler";

const tenants = [
  { id: "t1", name: "Demo", locale: "pt-PT", timezone: "Europe/Lisbon" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockBasePrisma.tenant.findMany.mockResolvedValue(tenants);
});

describe("resolveBriefingTargets", () => {
  it("filtra users com role=cliente fora", async () => {
    mockTenantDb.user.findMany.mockResolvedValue([]);
    await resolveBriefingTargets({ now: new Date("2026-04-27T07:00:00Z") });
    const where = mockTenantDb.user.findMany.mock.calls[0]?.[0]?.where;
    expect(where.role.in).toEqual(["admin", "manager", "membro"]);
    expect(where.isActive).toBe(true);
  });

  it("respeita opt-out (briefing.enabled=false)", async () => {
    mockTenantDb.user.findMany.mockResolvedValue([
      {
        id: "u-opt-out",
        role: "admin",
        email: "x@example.com",
        telegramChatId: null,
        whatsappPhoneId: null,
        notificationPrefs: { briefing: { enabled: false, hour: 8 } },
        person: { id: "p1", name: "X" },
      },
    ]);
    const targets = await resolveBriefingTargets({
      now: new Date("2026-04-27T07:00:00Z"), // 08:00 Lisboa
    });
    expect(targets).toHaveLength(0);
  });

  it("filtra por hora local; só inclui users cuja hour bate", async () => {
    mockTenantDb.user.findMany.mockResolvedValue([
      {
        id: "u-8",
        role: "admin",
        email: "a@x.com",
        telegramChatId: null,
        whatsappPhoneId: null,
        notificationPrefs: { briefing: { hour: 8 } },
        person: { id: "p1", name: "Eight" },
      },
      {
        id: "u-22",
        role: "admin",
        email: "b@x.com",
        telegramChatId: null,
        whatsappPhoneId: null,
        notificationPrefs: { briefing: { hour: 22 } },
        person: { id: "p2", name: "TwentyTwo" },
      },
    ]);

    const targets = await resolveBriefingTargets({
      now: new Date("2026-04-27T07:00:00Z"), // 08:00 em Lisboa
    });

    expect(targets.map((t) => t.user.id)).toEqual(["u-8"]);
  });

  it("force=true ignora hora preferida", async () => {
    mockTenantDb.user.findMany.mockResolvedValue([
      {
        id: "u-22",
        role: "admin",
        email: "b@x.com",
        telegramChatId: null,
        whatsappPhoneId: null,
        notificationPrefs: { briefing: { hour: 22 } },
        person: { id: "p2", name: "TwentyTwo" },
      },
    ]);
    const targets = await resolveBriefingTargets({
      now: new Date("2026-04-27T07:00:00Z"),
      force: true,
    });
    expect(targets).toHaveLength(1);
  });

  it("default hour = 8 quando user não definiu", async () => {
    mockTenantDb.user.findMany.mockResolvedValue([
      {
        id: "u-default",
        role: "membro",
        email: "c@x.com",
        telegramChatId: null,
        whatsappPhoneId: null,
        notificationPrefs: {},
        person: { id: "p3", name: "Default" },
      },
    ]);
    const at8 = await resolveBriefingTargets({
      now: new Date("2026-04-27T07:00:00Z"),
    });
    expect(at8).toHaveLength(1);

    mockTenantDb.user.findMany.mockResolvedValue([
      {
        id: "u-default",
        role: "membro",
        email: "c@x.com",
        telegramChatId: null,
        whatsappPhoneId: null,
        notificationPrefs: {},
        person: { id: "p3", name: "Default" },
      },
    ]);
    const at9 = await resolveBriefingTargets({
      now: new Date("2026-04-27T08:00:00Z"),
    });
    expect(at9).toHaveLength(0);
  });

  it("aceita filtros tenantIdFilter e userIdFilter", async () => {
    mockTenantDb.user.findMany.mockResolvedValue([]);
    await resolveBriefingTargets({
      tenantIdFilter: "t1",
      userIdFilter: "u-x",
      force: true,
    });
    expect(mockBasePrisma.tenant.findMany.mock.calls[0]?.[0]?.where.id).toBe("t1");
    expect(mockTenantDb.user.findMany.mock.calls[0]?.[0]?.where.id).toBe("u-x");
  });
});

describe("currentHourInTimezone", () => {
  it("Europa/Lisboa em UTC+1 (DST)", () => {
    const h = currentHourInTimezone(new Date("2026-04-27T07:00:00Z"), "Europe/Lisbon");
    expect(h).toBe(8);
  });

  it("Australia/Sydney à frente", () => {
    const h = currentHourInTimezone(new Date("2026-04-27T00:00:00Z"), "Australia/Sydney");
    // Sydney está à frente de Lisboa
    expect(h).toBeGreaterThanOrEqual(9);
  });

  it("fuso inválido → UTC", () => {
    const h = currentHourInTimezone(new Date("2026-04-27T07:00:00Z"), "Foo/Bar");
    expect(h).toBe(7);
  });
});
