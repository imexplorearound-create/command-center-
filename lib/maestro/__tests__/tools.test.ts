import { describe, it, expect, vi, beforeEach } from "vitest";

const { mocks, mockDb, mockBasePrisma } = vi.hoisted(() => {
  const m = {
    project: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    task: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    person: { findMany: vi.fn(), findFirst: vi.fn() },
    trustScore: { findUnique: vi.fn(), findFirst: vi.fn() },
    decision: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  };
  const base = {
    user: { findUnique: vi.fn() },
  };
  return { mocks: m, mockDb: m, mockBasePrisma: base };
});

vi.mock("@/lib/db", () => ({
  prisma: mockDb,
  basePrisma: mockBasePrisma,
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
import { arquivarTarefaTool } from "../tools/arquivar-tarefa";
import { restaurarTarefaTool } from "../tools/restaurar-tarefa";
import { listarDecisoesTool } from "../tools/listar-decisoes";
import { resolverDecisaoTool } from "../tools/resolver-decisao";
import { registarDecisaoTool } from "../tools/registar-decisao";

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

  it("aplica dueBefore + dueAfter (intervalo de prazo)", async () => {
    mocks.task.findMany.mockResolvedValue([]);
    await listarTarefasTool.execute(
      { dueAfter: "2026-04-29", dueBefore: "2026-04-29" },
      ctx,
    );
    const where = mocks.task.findMany.mock.calls[0][0].where;
    expect(where.deadline).toEqual({
      gte: new Date("2026-04-29"),
      lte: new Date("2026-04-29"),
    });
  });

  it("overdue:true → deadline < hoje E status != feito", async () => {
    mocks.task.findMany.mockResolvedValue([]);
    await listarTarefasTool.execute({ overdue: true }, ctx);
    const where = mocks.task.findMany.mock.calls[0][0].where;
    expect(where.deadline.lt).toBeInstanceOf(Date);
    expect(where.status).toEqual({ not: "feito" });
  });

  it("overdue:true respeita status explícito do utilizador", async () => {
    mocks.task.findMany.mockResolvedValue([]);
    await listarTarefasTool.execute({ overdue: true, status: "em_curso" }, ctx);
    const where = mocks.task.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("em_curso");
  });

  it("validationStatus filtra por_confirmar", async () => {
    mocks.task.findMany.mockResolvedValue([]);
    await listarTarefasTool.execute({ validationStatus: "por_confirmar" }, ctx);
    const where = mocks.task.findMany.mock.calls[0][0].where;
    expect(where.validationStatus).toBe("por_confirmar");
  });

  it("rejeita dueBefore mal formatado", async () => {
    const r = await listarTarefasTool.execute({ dueBefore: "29/04/2026" }, ctx);
    expect(r.ok).toBe(false);
  });

  it("rejeita overdue + dueBefore (combinação ambígua)", async () => {
    const r = await listarTarefasTool.execute(
      { overdue: true, dueBefore: "2026-04-29" },
      ctx,
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/overdue/i);
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

// ─── Sprint 6c: archive/restore + decisões ──────────────────

describe("arquivar_tarefa", () => {
  it("bloqueia se a tarefa pertence a workflow activo", async () => {
    mockFoundTask();
    mocks.task.findUnique.mockResolvedValueOnce({
      archivedAt: null,
      workflowInstanceTasks: [{ id: "w1" }],
    });
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    const r = await arquivarTarefaTool.execute({ idOrTitle: "Tarefa" }, ctx);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/workflow activo/);
    expect(mocks.task.update).not.toHaveBeenCalled();
  });

  it("bloqueia se já arquivada", async () => {
    mockFoundTask();
    mocks.task.findUnique.mockResolvedValueOnce({
      archivedAt: new Date(),
      workflowInstanceTasks: [],
    });
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    const r = await arquivarTarefaTool.execute({ idOrTitle: "Tarefa" }, ctx);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/já está arquivada/);
  });

  it("sucesso → marca archivedAt", async () => {
    mockFoundTask();
    mocks.task.findUnique.mockResolvedValueOnce({
      archivedAt: null,
      workflowInstanceTasks: [],
    });
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    mocks.task.update.mockResolvedValue({});
    const r = await arquivarTarefaTool.execute({ idOrTitle: "Tarefa" }, ctx);
    expect(r.ok).toBe(true);
    expect(mocks.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
  });
});

describe("restaurar_tarefa", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";

  it("bloqueia se user não é admin", async () => {
    mockBasePrisma.user.findUnique.mockResolvedValue({ role: "membro" });
    const r = await restaurarTarefaTool.execute({ id: validUuid }, ctx);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/admin-only/);
  });

  it("bloqueia se tarefa não está arquivada", async () => {
    mockBasePrisma.user.findUnique.mockResolvedValue({ role: "admin" });
    mocks.task.findUnique.mockResolvedValue({
      id: validUuid,
      title: "X",
      archivedAt: null,
      project: null,
    });
    const r = await restaurarTarefaTool.execute({ id: validUuid }, ctx);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/não está arquivada/);
  });

  it("admin restaura → archivedAt vira null", async () => {
    mockBasePrisma.user.findUnique.mockResolvedValue({ role: "admin" });
    mocks.task.findUnique.mockResolvedValue({
      id: validUuid,
      title: "X",
      archivedAt: new Date(),
      project: { slug: "p1" },
    });
    mocks.task.update.mockResolvedValue({});
    const r = await restaurarTarefaTool.execute({ id: validUuid }, ctx);
    expect(r.ok).toBe(true);
    expect(mocks.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { archivedAt: null } }),
    );
  });
});

describe("listar_decisoes", () => {
  it("filtra resolvedAt:null + esconde snoozed", async () => {
    mocks.decision.findMany.mockResolvedValue([]);
    await listarDecisoesTool.execute({}, ctx);
    const where = mocks.decision.findMany.mock.calls[0][0].where;
    expect(where.resolvedAt).toBeNull();
    expect(where.OR).toBeDefined();
  });

  it("includeSnoozed:true não filtra snoozedUntil", async () => {
    mocks.decision.findMany.mockResolvedValue([]);
    await listarDecisoesTool.execute({ includeSnoozed: true }, ctx);
    const where = mocks.decision.findMany.mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
  });

  it("filtra por kind e severity", async () => {
    mocks.decision.findMany.mockResolvedValue([]);
    await listarDecisoesTool.execute(
      { kind: "client_reply", severity: "block" },
      ctx,
    );
    const where = mocks.decision.findMany.mock.calls[0][0].where;
    expect(where.kind).toBe("client_reply");
    expect(where.severity).toBe("block");
  });

  it("projectSlug inválido devolve erro", async () => {
    mocks.project.findFirst.mockResolvedValue(null);
    const r = await listarDecisoesTool.execute({ projectSlug: "ghost" }, ctx);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ghost/);
  });
});

describe("resolver_decisao", () => {
  const validUuid = "22222222-2222-4222-8222-222222222222";

  it("bloqueia se decisão já resolvida", async () => {
    mocks.decision.findUnique.mockResolvedValue({
      id: validUuid,
      title: "X",
      resolvedAt: new Date(),
    });
    const r = await resolverDecisaoTool.execute(
      { decisionId: validUuid },
      ctx,
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/já está resolvida/);
  });

  it("sucesso → marca resolvedAt + resolvedById + resolutionSource human", async () => {
    mocks.decision.findUnique.mockResolvedValue({
      id: validUuid,
      title: "X",
      resolvedAt: null,
    });
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    mocks.decision.update.mockResolvedValue({});
    const r = await resolverDecisaoTool.execute(
      { decisionId: validUuid, resolutionNote: "feito" },
      ctx,
    );
    expect(r.ok).toBe(true);
    expect(mocks.decision.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resolvedAt: expect.any(Date),
          resolvedById: ctx.personId,
          resolutionNote: "feito",
          resolutionSource: "human",
        }),
      }),
    );
  });
});

describe("registar_decisao", () => {
  it("rejeita projectSlug inexistente", async () => {
    mocks.project.findFirst.mockResolvedValue(null);
    const r = await registarDecisaoTool.execute(
      { title: "Cliente X parado", kind: "client_reply", severity: "warn", projectSlug: "ghost" },
      ctx,
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ghost/);
  });

  it("rejeita dueAt malformado", async () => {
    const r = await registarDecisaoTool.execute(
      { title: "X", kind: "other", severity: "pend", dueAt: "ontem-de-tarde" },
      ctx,
    );
    expect(r.ok).toBe(false);
  });

  it("cria decisão sem projecto", async () => {
    mocks.trustScore.findFirst.mockResolvedValue({ score: 80 });
    mocks.decision.create.mockResolvedValue({ id: "d1", title: "X" });
    const r = await registarDecisaoTool.execute(
      { title: "Cliente X parado", kind: "client_reply", severity: "warn" },
      ctx,
    );
    expect(r.ok).toBe(true);
    expect(mocks.decision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Cliente X parado",
          kind: "client_reply",
          severity: "warn",
          projectId: null,
        }),
      }),
    );
  });
});
