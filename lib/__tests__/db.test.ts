import { describe, it, expect, vi } from "vitest";

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class {},
}));

vi.mock("@prisma/client", () => {
  // Minimal PrismaClient mock com suporte a $extends (chain-compatível).
  class MockPrismaClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $extends(config: any) {
      const hook = config.query.$allModels.$allOperations;
      // Devolve um proxy que simula um modelo (e.g. prisma.task.create({...}))
      return new Proxy(
        {},
        {
          get: (_t, model: string) => {
            return new Proxy(
              {},
              {
                get: (_t2, operation: string) => {
                  return async (args: unknown) =>
                    hook({
                      model,
                      operation,
                      args,
                      query: async (a: unknown) => a, // echo
                    });
                },
              }
            );
          },
        }
      );
    }
  }
  return { PrismaClient: MockPrismaClient };
});

import { tenantPrisma } from "../db";

describe("tenantPrisma — guardas multi-tenant", () => {
  it("rejeita tenantPrisma() com tenantId vazio", () => {
    expect(() => tenantPrisma("")).toThrow(/tenantId/);
  });

  it("injecta tenantId em create quando data.tenantId é ''", async () => {
    const db = tenantPrisma("tenant-A");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (db as any).project.create({
      data: { tenantId: "", name: "X" },
    });
    expect(result.data.tenantId).toBe("tenant-A");
  });

  it("injecta tenantId em create quando data não tem tenantId", async () => {
    const db = tenantPrisma("tenant-A");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (db as any).project.create({
      data: { name: "Y" },
    });
    expect(result.data.tenantId).toBe("tenant-A");
  });

  it("rejeita create com tenantId explícito diferente", async () => {
    const db = tenantPrisma("tenant-A");
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any).project.create({ data: { tenantId: "tenant-B", name: "Z" } })
    ).rejects.toThrow(/cross-tenant/);
  });

  it("rejeita createMany se algum item tiver tenantId diferente", async () => {
    const db = tenantPrisma("tenant-A");
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any).project.createMany({
        data: [
          { tenantId: "", name: "1" },
          { tenantId: "tenant-B", name: "2" },
        ],
      })
    ).rejects.toThrow(/cross-tenant/);
  });

  it("injecta tenantId em where de findMany", async () => {
    const db = tenantPrisma("tenant-A");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (db as any).project.findMany({
      where: { archivedAt: null },
    });
    expect(result.where.tenantId).toBe("tenant-A");
    expect(result.where.archivedAt).toBe(null);
  });

  it("rejeita update com data.tenantId diferente", async () => {
    const db = tenantPrisma("tenant-A");
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any).project.update({
        where: { id: "p1" },
        data: { tenantId: "tenant-B" },
      })
    ).rejects.toThrow(/cross-tenant/);
  });

  it("filtra Tenant e ModuleCatalog sem injecção de tenantId", async () => {
    const db = tenantPrisma("tenant-A");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (db as any).Tenant.findMany({ where: {} });
    expect(result.where.tenantId).toBeUndefined();
  });
});
