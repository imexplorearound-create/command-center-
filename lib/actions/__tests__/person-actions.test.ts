import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const person = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mockPrisma = { person };
  return { person, mockPrisma, requireAdmin: vi.fn() };
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

import { createPerson, updatePerson, archivePerson } from "../person-actions";

const OK = {
  ok: true as const,
  user: { userId: "u1", personId: "p1", email: "x@y", role: "admin" as const, name: "A", projectIds: [] },
};
const FAIL = { ok: false as const, error: "Sem permissão" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue(OK);
});

describe("createPerson", () => {
  it("bloqueia sem auth", async () => {
    mocks.requireAdmin.mockResolvedValueOnce(FAIL);
    const fd = new FormData();
    fd.set("name", "Ana");
    fd.set("type", "equipa");
    const r = await createPerson(undefined, fd);
    expect(r).toEqual({ error: "Sem permissão" });
  });

  it("rejeita nome vazio", async () => {
    const fd = new FormData();
    fd.set("name", "");
    fd.set("type", "equipa");
    const r = await createPerson(undefined, fd);
    expect("error" in r).toBe(true);
    expect(mocks.person.create).not.toHaveBeenCalled();
  });

  it("cria com sucesso", async () => {
    mocks.person.create.mockResolvedValue({ id: "new" });
    const fd = new FormData();
    fd.set("name", "Ana");
    fd.set("type", "equipa");
    fd.set("email", "ana@x.pt");
    const r = await createPerson(undefined, fd);
    expect(r).toEqual({ success: true, data: { id: "new" } });
  });
});

describe("archivePerson", () => {
  it("bloqueia se tem tasks activas", async () => {
    mocks.person.findUnique.mockResolvedValue({
      id: "p1",
      archivedAt: null,
      _count: { tasks: 3, workflowDefaultAssignee: 0 },
    });
    const r = await archivePerson("p1");
    expect("error" in r).toBe(true);
    expect((r as { error: string }).error).toMatch(/3 tarefa/i);
  });

  it("bloqueia se é assignee default em workflow", async () => {
    mocks.person.findUnique.mockResolvedValue({
      id: "p1",
      archivedAt: null,
      _count: { tasks: 0, workflowDefaultAssignee: 2 },
    });
    const r = await archivePerson("p1");
    expect("error" in r).toBe(true);
    expect((r as { error: string }).error).toMatch(/workflow/i);
  });

  it("arquiva se livre", async () => {
    mocks.person.findUnique.mockResolvedValue({
      id: "p1",
      archivedAt: null,
      _count: { tasks: 0, workflowDefaultAssignee: 0 },
    });
    mocks.person.update.mockResolvedValue({});
    const r = await archivePerson("p1");
    expect(r).toEqual({ success: true });
    expect(mocks.person.update.mock.calls[0][0].data.archivedAt).toBeInstanceOf(Date);
  });

  it("bloqueia se já arquivada", async () => {
    mocks.person.findUnique.mockResolvedValue({
      id: "p1",
      archivedAt: new Date(),
      _count: { tasks: 0, workflowDefaultAssignee: 0 },
    });
    const r = await archivePerson("p1");
    expect(r).toEqual({ error: "Pessoa já está arquivada" });
  });
});

describe("updatePerson", () => {
  it("bloqueia pessoa arquivada", async () => {
    mocks.person.findUnique.mockResolvedValue({ id: "p1", archivedAt: new Date() });
    const fd = new FormData();
    fd.set("id", "p1");
    fd.set("name", "Novo");
    const r = await updatePerson(undefined, fd);
    expect(r).toEqual({ error: "Pessoa arquivada não pode ser editada" });
  });
});
