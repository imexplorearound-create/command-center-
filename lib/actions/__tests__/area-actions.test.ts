import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const area = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mockPrisma = { area };
  return { area, mockPrisma, requireAdmin: vi.fn() };
});

vi.mock("@/lib/db", () => ({
  prisma: mocks.mockPrisma,
  basePrisma: mocks.mockPrisma,
}));

vi.mock("@/lib/tenant", () => ({
  getTenantDb: vi.fn().mockResolvedValue(mocks.mockPrisma),
  getTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
}));

vi.mock("@/lib/auth/dal", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createArea, archiveArea } from "../area-actions";

const OK = {
  ok: true as const,
  user: { userId: "u1", personId: "p1", email: "x@y", role: "admin" as const, name: "A", projectIds: [] },
};
const FAIL = { ok: false as const, error: "Sem permissão" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue(OK);
});

describe("createArea", () => {
  it("bloqueia sem auth", async () => {
    mocks.requireAdmin.mockResolvedValueOnce(FAIL);
    const fd = new FormData();
    fd.set("name", "RH");
    const r = await createArea(undefined, fd);
    expect(r).toEqual({ error: "Sem permissão" });
  });

  it("auto-gera slug a partir do nome", async () => {
    mocks.area.findFirst.mockResolvedValue(null);
    mocks.area.create.mockResolvedValue({});
    const fd = new FormData();
    fd.set("name", "Recursos Humanos");
    const r = await createArea(undefined, fd);
    expect(r).toEqual({ success: true, data: { slug: "recursos-humanos" } });
  });

  it("rejeita slug duplicado via P2002", async () => {
    const { Prisma } = await import("@prisma/client");
    mocks.area.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "7.6.0" })
    );
    const fd = new FormData();
    fd.set("name", "RH");
    fd.set("slug", "rh");
    const r = await createArea(undefined, fd);
    expect(r).toEqual({ error: 'Slug "rh" já existe' });
  });
});

describe("archiveArea", () => {
  it("bloqueia se tem tasks activas", async () => {
    mocks.area.findFirst.mockResolvedValue({
      id: "a1",
      archivedAt: null,
      _count: { tasks: 5, workflowTemplates: 0, workflowInstances: 0 },
    });
    const r = await archiveArea("rh");
    expect("error" in r).toBe(true);
    expect((r as { error: string }).error).toMatch(/5 tarefa/i);
  });

  it("bloqueia se tem workflow templates", async () => {
    mocks.area.findFirst.mockResolvedValue({
      id: "a1",
      archivedAt: null,
      _count: { tasks: 0, workflowTemplates: 2, workflowInstances: 0 },
    });
    const r = await archiveArea("rh");
    expect("error" in r).toBe(true);
    expect((r as { error: string }).error).toMatch(/workflow template/i);
  });

  it("bloqueia se tem workflow instances activas", async () => {
    mocks.area.findFirst.mockResolvedValue({
      id: "a1",
      archivedAt: null,
      _count: { tasks: 0, workflowTemplates: 0, workflowInstances: 1 },
    });
    const r = await archiveArea("rh");
    expect("error" in r).toBe(true);
    expect((r as { error: string }).error).toMatch(/em curso/i);
  });

  it("arquiva se livre", async () => {
    mocks.area.findFirst.mockResolvedValue({
      id: "a1",
      archivedAt: null,
      _count: { tasks: 0, workflowTemplates: 0, workflowInstances: 0 },
    });
    mocks.area.update.mockResolvedValue({});
    const r = await archiveArea("rh");
    expect(r).toEqual({ success: true });
  });
});
