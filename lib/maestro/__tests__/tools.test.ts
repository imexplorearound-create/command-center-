import { describe, it, expect, vi, beforeEach } from "vitest";

const { mocks, mockDb } = vi.hoisted(() => {
  const m = {
    project: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    task: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    person: { findMany: vi.fn(), findFirst: vi.fn() },
    trustScore: { findUnique: vi.fn(), findFirst: vi.fn() },
  };
  return { mocks: m, mockDb: m };
});

vi.mock("@/lib/db", () => ({
  prisma: mockDb,
}));

vi.mock("@/lib/tenant", () => ({
  getTenantDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { listarProjectosTool } from "../tools/listar-projectos";
import { listarTarefasTool } from "../tools/listar-tarefas";
import { listarPessoasTool } from "../tools/listar-pessoas";
import { criarTarefaTool, MAESTRO_CHAT_AGENT_ID } from "../tools/criar-tarefa";
import { actualizarTarefaTool } from "../tools/actualizar-tarefa";
import { mudarEstadoTarefaTool } from "../tools/mudar-estado-tarefa";
import { concluirTarefaTool } from "../tools/concluir-tarefa";
import { comentarTarefaTool } from "../tools/comentar-tarefa";
import { atribuirResponsavelTool } from "../tools/atribuir-responsavel";

const ctx = { userId: "u1", personId: "p1" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listar_projectos", () => {
  it("devolve lista mapeada", async () => {
    mocks.project.findMany.mockResolvedValue([
      {
        id: "p1",
        name: "Aura PMS",
        slug: "aura-pms",
        type: "interno",
        status: "active",
        health: "green",
        progress: 50,
      },
    ]);
    const r = await listarProjectosTool.execute({}, ctx);
    expect(r.ok).toBe(true);
    expect((r.data as Array<{ slug: string }>)[0].slug).toBe("aura-pms");
    expect(mocks.project.findMany).toHaveBeenCalled();
  });

  it("aceita limit", async () => {
    mocks.project.findMany.mockResolvedValue([]);
    await listarProjectosTool.execute({ limit: 5 }, ctx);
    expect(mocks.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });
});

describe("listar_tarefas", () => {
  it("aplica filtro projectSlug", async () => {
    mocks.task.findMany.mockResolvedValue([]);
    await listarTarefasTool.execute({ projectSlug: "aura-pms" }, ctx);
    expect(mocks.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          archivedAt: null,
          project: { slug: "aura-pms" },
        }),
      })
    );
  });

  it("rejeita status inválido", async () => {
    const r = await listarTarefasTool.execute({ status: "invalido" }, ctx);
    expect(r.ok).toBe(false);
  });
});

describe("listar_pessoas", () => {
  it("filtra por type=equipa", async () => {
    mocks.person.findMany.mockResolvedValue([]);
    await listarPessoasTool.execute({ type: "equipa" }, ctx);
    expect(mocks.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "equipa", archivedAt: null }),
      })
    );
  });
});

describe("criar_tarefa", () => {
  it("erro se title vazio", async () => {
    const r = await criarTarefaTool.execute({ title: "" }, ctx);
    expect(r.ok).toBe(false);
  });

  it("erro quando projectSlug não existe", async () => {
    mocks.project.findFirst.mockResolvedValue(null);
    mocks.trustScore.findFirst.mockResolvedValue({ score: 0 });
    const r = await criarTarefaTool.execute(
      { title: "Test", projectSlug: "missing" },
      ctx
    );
    expect(r.ok).toBe(false);
    expect(r.error).toContain("missing");
  });

  it("cria tarefa por_confirmar quando score baixo", async () => {
    mocks.project.findFirst.mockResolvedValue({
      id: "proj1",
      client: { id: "c1" },
    });
    mocks.trustScore.findFirst.mockResolvedValue({ score: 10 }); // aprendizagem
    mocks.task.create.mockResolvedValue({
      id: "t1",
      title: "Test",
      status: "backlog",
      validationStatus: "por_confirmar",
    });

    const r = await criarTarefaTool.execute(
      { title: "Test", projectSlug: "aura-pms" },
      ctx
    );
    expect(r.ok).toBe(true);
    expect(mocks.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          validationStatus: "por_confirmar",
          aiExtracted: true,
          origin: `maestro-chat:${ctx.personId}`,
        }),
      })
    );
    expect((r.data as { gating: string }).gating).toBe("pending");
  });

  it("cria tarefa confirmada quando score alto", async () => {
    mocks.project.findFirst.mockResolvedValue({
      id: "proj1",
      client: null,
    });
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    mocks.task.create.mockResolvedValue({
      id: "t2",
      title: "Auto",
      status: "backlog",
      validationStatus: "confirmado",
    });

    const r = await criarTarefaTool.execute(
      { title: "Auto", projectSlug: "aura-pms" },
      ctx
    );
    expect(r.ok).toBe(true);
    expect((r.data as { gating: string }).gating).toBe("executed");
  });

  it("usa MAESTRO_CHAT_AGENT_ID no gating", async () => {
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    mocks.task.create.mockResolvedValue({
      id: "t3",
      title: "X",
      status: "backlog",
      validationStatus: "confirmado",
    });

    await criarTarefaTool.execute({ title: "X" }, ctx);
    expect(mocks.trustScore.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          agentId: MAESTRO_CHAT_AGENT_ID,
          extractionType: "tarefa",
        },
      })
    );
  });
});

// ─── P1: tools de actualização de tarefa ───────────────────

function mockFoundTask(overrides: Partial<{ id: string; title: string; description: string | null; projectSlug: string | null }> = {}) {
  const task = {
    id: "t-uuid-1",
    title: "Tarefa teste",
    description: null,
    archivedAt: null,
    project: { slug: overrides.projectSlug ?? "test-proj" },
    ...overrides,
  };
  mocks.task.findMany.mockResolvedValue([task]);
  mocks.task.findUnique.mockResolvedValue(task);
  return task;
}

describe("actualizar_tarefa", () => {
  it("rejeita quando nenhum campo para actualizar", async () => {
    const r = await actualizarTarefaTool.execute({ idOrTitle: "tarefa" }, ctx);
    expect(r.ok).toBe(false);
  });

  it("actualiza título quando tarefa é única", async () => {
    mockFoundTask();
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    mocks.task.update.mockResolvedValue({});
    const r = await actualizarTarefaTool.execute(
      { idOrTitle: "Tarefa", title: "Novo título" },
      ctx
    );
    expect(r.ok).toBe(true);
    expect(mocks.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: "Novo título" }) })
    );
  });

  it("devolve erro ambíguo quando múltiplos matches", async () => {
    mocks.task.findMany.mockResolvedValue([
      { id: "a", title: "Task A", description: null, archivedAt: null, project: null },
      { id: "b", title: "Task B", description: null, archivedAt: null, project: null },
    ]);
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    const r = await actualizarTarefaTool.execute(
      { idOrTitle: "Task", title: "X" },
      ctx
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/correspondem/i);
  });
});

describe("mudar_estado_tarefa", () => {
  it("rejeita status inválido (ex: 'done')", async () => {
    const r = await mudarEstadoTarefaTool.execute(
      { idOrTitle: "x", status: "done" },
      ctx
    );
    expect(r.ok).toBe(false);
  });

  it("aceita status 'feito' e marca completedAt", async () => {
    mockFoundTask();
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    mocks.task.update.mockResolvedValue({});
    const r = await mudarEstadoTarefaTool.execute(
      { idOrTitle: "Tarefa", status: "feito" },
      ctx
    );
    expect(r.ok).toBe(true);
    expect(mocks.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "feito", completedAt: expect.any(Date) }),
      })
    );
  });

  it("limpa completedAt quando status não é 'feito'", async () => {
    mockFoundTask();
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    mocks.task.update.mockResolvedValue({});
    await mudarEstadoTarefaTool.execute(
      { idOrTitle: "Tarefa", status: "em_curso" },
      ctx
    );
    expect(mocks.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "em_curso", completedAt: null }),
      })
    );
  });
});

describe("concluir_tarefa", () => {
  it("escreve status='feito'", async () => {
    mockFoundTask();
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    mocks.task.update.mockResolvedValue({});
    const r = await concluirTarefaTool.execute({ idOrTitle: "Tarefa" }, ctx);
    expect(r.ok).toBe(true);
    expect(mocks.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "feito" }) })
    );
  });
});

describe("comentar_tarefa", () => {
  it("appenda marcador [Maestro ...] à description existente", async () => {
    mockFoundTask({ description: "Descrição original" });
    mocks.task.update.mockResolvedValue({});
    const r = await comentarTarefaTool.execute(
      { idOrTitle: "Tarefa", comment: "Nota 1" },
      ctx
    );
    expect(r.ok).toBe(true);
    const call = mocks.task.update.mock.calls[0]![0];
    expect(call.data.description).toMatch(/^Descrição original\n\n\[Maestro .+\] Nota 1$/);
  });

  it("funciona mesmo com description null", async () => {
    mockFoundTask({ description: null });
    mocks.task.update.mockResolvedValue({});
    const r = await comentarTarefaTool.execute(
      { idOrTitle: "Tarefa", comment: "Primeira nota" },
      ctx
    );
    expect(r.ok).toBe(true);
  });
});

describe("atribuir_responsavel", () => {
  it("falha se pessoa não encontrada", async () => {
    mockFoundTask();
    mocks.person.findFirst.mockResolvedValue(null);
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    const r = await atribuirResponsavelTool.execute(
      { idOrTitle: "Tarefa", assigneeName: "Inexistente" },
      ctx
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Inexistente/);
  });

  it("atribui assigneeId quando pessoa existe", async () => {
    mockFoundTask();
    mocks.person.findFirst.mockResolvedValue({ id: "person-1" });
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    mocks.task.update.mockResolvedValue({});
    const r = await atribuirResponsavelTool.execute(
      { idOrTitle: "Tarefa", assigneeName: "Bruno" },
      ctx
    );
    expect(r.ok).toBe(true);
    expect(mocks.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { assigneeId: "person-1" } })
    );
  });
});
