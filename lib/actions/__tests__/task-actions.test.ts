import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks têm de ser declarados ANTES de importar o módulo testado.
// vi.hoisted garante que estas variáveis existem no momento dos vi.mock.
const mocks = vi.hoisted(() => {
  const task = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };
  const project = { findUnique: vi.fn() };
  const $transaction = vi.fn();
  const mockPrisma = { task, project, $transaction };
  return { task, project, $transaction, mockPrisma, requireAdmin: vi.fn(), requireWriter: vi.fn() };
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
  requireWriter: mocks.requireWriter,
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createTask, updateTask, archiveTask, moveTask } from "../task-actions";

const OK_USER = {
  ok: true as const,
  user: {
    userId: "u1",
    personId: "p1",
    email: "m@x",
    role: "membro" as const,
    name: "Membro",
    projectIds: [],
  },
};
const FAIL_AUTH = { ok: false as const, error: "Sem permissão" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWriter.mockResolvedValue(OK_USER);
  mocks.requireAdmin.mockResolvedValue(OK_USER);
  // $transaction recebe array OU callback. Suporta os dois.
  mocks.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === "function") {
      return (arg as (tx: unknown) => unknown)({
        task: mocks.task,
      });
    }
    return arg;
  });
  mocks.project.findUnique.mockResolvedValue({ slug: "test-proj" });
});

// ─── createTask ─────────────────────────────────────────────

describe("createTask", () => {
  it("bloqueia sem auth", async () => {
    mocks.requireWriter.mockResolvedValueOnce(FAIL_AUTH);
    const fd = new FormData();
    fd.set("title", "Nova");
    const r = await createTask(undefined, fd);
    expect(r).toEqual({ error: "Sem permissão" });
    expect(mocks.task.create).not.toHaveBeenCalled();
  });

  it("rejeita título vazio", async () => {
    const fd = new FormData();
    fd.set("title", "");
    const r = await createTask(undefined, fd);
    expect("error" in r).toBe(true);
    expect(mocks.task.create).not.toHaveBeenCalled();
  });

  it("calcula kanbanOrder = max+1", async () => {
    mocks.task.findFirst.mockResolvedValue({ kanbanOrder: 4 });
    mocks.task.create.mockResolvedValue({ id: "new-id" });
    const fd = new FormData();
    fd.set("title", "Tarefa X");
    fd.set("status", "em_curso");

    const r = await createTask(undefined, fd);
    expect(r).toEqual({ success: true, data: { id: "new-id" } });
    const call = mocks.task.create.mock.calls[0][0];
    expect(call.data.kanbanOrder).toBe(5);
    expect(call.data.status).toBe("em_curso");
    expect(call.data.validationStatus).toBe("confirmado");
  });

  it("define kanbanOrder = 0 se coluna vazia", async () => {
    mocks.task.findFirst.mockResolvedValue(null);
    mocks.task.create.mockResolvedValue({ id: "x" });
    const fd = new FormData();
    fd.set("title", "Primeira");
    await createTask(undefined, fd);
    expect(mocks.task.create.mock.calls[0][0].data.kanbanOrder).toBe(0);
  });
});

// ─── updateTask ─────────────────────────────────────────────

describe("updateTask", () => {
  it("bloqueia tarefa arquivada", async () => {
    mocks.task.findUnique.mockResolvedValue({
      id: "t1",
      projectId: "p1",
      status: "a_fazer",
      archivedAt: new Date(),
      validationStatus: "confirmed",
    });
    const fd = new FormData();
    fd.set("id", "t1");
    fd.set("title", "Novo");
    const r = await updateTask(undefined, fd);
    expect(r).toEqual({ error: "Tarefa arquivada não pode ser editada" });
  });

  it("bloqueia mover para feito se por_confirmar", async () => {
    mocks.task.findUnique.mockResolvedValue({
      id: "t1",
      projectId: "p1",
      status: "em_curso",
      archivedAt: null,
      validationStatus: "por_confirmar",
    });
    const fd = new FormData();
    fd.set("id", "t1");
    fd.set("status", "feito");
    const r = await updateTask(undefined, fd);
    expect(r).toEqual({ error: "Confirma a tarefa antes de a marcar como feita" });
    expect(mocks.task.update).not.toHaveBeenCalled();
  });

  it("define completedAt ao mover para feito", async () => {
    mocks.task.findUnique.mockResolvedValue({
      id: "t1",
      projectId: "p1",
      status: "em_curso",
      archivedAt: null,
      validationStatus: "confirmed",
    });
    mocks.task.update.mockResolvedValue({});
    const fd = new FormData();
    fd.set("id", "t1");
    fd.set("status", "feito");
    await updateTask(undefined, fd);
    const call = mocks.task.update.mock.calls[0][0];
    expect(call.data.status).toBe("feito");
    expect(call.data.completedAt).toBeInstanceOf(Date);
  });
});

// ─── archiveTask ────────────────────────────────────────────

describe("archiveTask", () => {
  it("bloqueia se em workflow activo", async () => {
    mocks.task.findUnique.mockResolvedValue({
      id: "t1",
      projectId: "p1",
      archivedAt: null,
      workflowInstanceTasks: [{ id: "wt1" }],
    });
    const r = await archiveTask("t1");
    expect("error" in r).toBe(true);
    expect((r as { error: string }).error).toMatch(/workflow/i);
  });

  it("arquiva se livre", async () => {
    mocks.task.findUnique.mockResolvedValue({
      id: "t1",
      projectId: "p1",
      archivedAt: null,
      workflowInstanceTasks: [],
    });
    mocks.task.update.mockResolvedValue({});
    const r = await archiveTask("t1");
    expect(r).toEqual({ success: true });
    const call = mocks.task.update.mock.calls[0][0];
    expect(call.data.archivedAt).toBeInstanceOf(Date);
  });

  it("bloqueia se já arquivada", async () => {
    mocks.task.findUnique.mockResolvedValue({
      id: "t1",
      projectId: "p1",
      archivedAt: new Date(),
      workflowInstanceTasks: [],
    });
    const r = await archiveTask("t1");
    expect(r).toEqual({ error: "Tarefa já está arquivada" });
  });
});

// ─── moveTask ───────────────────────────────────────────────

describe("moveTask", () => {
  it("bloqueia mover para feito se por_confirmar", async () => {
    mocks.task.findUnique.mockResolvedValue({
      id: "t1",
      projectId: "p1",
      status: "em_curso",
      kanbanOrder: 0,
      archivedAt: null,
      validationStatus: "por_confirmar",
    });
    const r = await moveTask("t1", { toStatus: "feito", toIndex: 0 });
    expect("error" in r).toBe(true);
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it("permite mover por_confirmar para outra coluna não-feito", async () => {
    mocks.task.findUnique.mockResolvedValue({
      id: "t1",
      projectId: "p1",
      status: "backlog",
      kanbanOrder: 0,
      archivedAt: null,
      validationStatus: "por_confirmar",
    });
    mocks.task.findMany.mockResolvedValue([]);
    const r = await moveTask("t1", { toStatus: "em_curso", toIndex: 0 });
    expect(r).toEqual({ success: true });
  });

  it("rejeita input inválido", async () => {
    const r = await moveTask("t1", { toStatus: "invalid" as never, toIndex: 0 });
    expect("error" in r).toBe(true);
  });
});

