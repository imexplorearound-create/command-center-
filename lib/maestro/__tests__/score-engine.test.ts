import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const trustScore = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  };
  const maestroAction = { create: vi.fn() };
  const $transaction = vi.fn();
  const mockPrisma = { trustScore, maestroAction, $transaction };
  return { trustScore, maestroAction, $transaction, mockPrisma };
});

vi.mock("@/lib/db", () => ({
  prisma: mocks.mockPrisma,
  basePrisma: mocks.mockPrisma,
}));

vi.mock("@/lib/tenant", () => ({
  getTenantDb: vi.fn().mockResolvedValue(mocks.mockPrisma),
  getTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
}));

import { recordValidation, MAESTRO_INTERNAL } from "../score-engine";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
    return cb({
      trustScore: mocks.trustScore,
      maestroAction: mocks.maestroAction,
    });
  });
});

describe("recordValidation", () => {
  it("upsert + regista MaestroAction quando score não existe", async () => {
    mocks.trustScore.findUnique.mockResolvedValue(null);

    const r = await recordValidation({
      extractionType: "tarefa",
      action: "confirmar",
      entityType: "task",
      entityId: "task-1",
      performedById: "person-1",
    });

    expect(r).toEqual({ scoreBefore: 0, scoreAfter: 2, delta: 2 });
    expect(mocks.trustScore.upsert).toHaveBeenCalledTimes(1);

    const upsertArgs = mocks.trustScore.upsert.mock.calls[0][0];
    expect(upsertArgs.where.tenantId_agentId_extractionType).toEqual({
      tenantId: "test-tenant-id",
      agentId: MAESTRO_INTERNAL,
      extractionType: "tarefa",
    });
    expect(upsertArgs.create.tenantId).toBe("test-tenant-id");
    expect(upsertArgs.create.score).toBe(2);
    expect(upsertArgs.create.totalConfirmations).toBe(1);
    expect(upsertArgs.update.score).toBe(2);

    const actionArgs = mocks.maestroAction.create.mock.calls[0][0];
    expect(actionArgs.data.tenantId).toBe("test-tenant-id");
    expect(actionArgs.data.scoreDelta).toBe(2);
    expect(actionArgs.data.scoreBefore).toBe(0);
    expect(actionArgs.data.scoreAfter).toBe(2);
    expect(actionArgs.data.action).toBe("confirmar");
  });

  it("upsert + increment confirmations quando score existe", async () => {
    mocks.trustScore.findUnique.mockResolvedValue({ score: 10 });

    const r = await recordValidation({
      extractionType: "tarefa",
      action: "confirmar",
      entityType: "task",
      entityId: "t1",
      performedById: "p1",
    });

    expect(r).toEqual({ scoreBefore: 10, scoreAfter: 12, delta: 2 });
    const upsertArgs = mocks.trustScore.upsert.mock.calls[0][0];
    expect(upsertArgs.update.score).toBe(12);
    expect(upsertArgs.update.totalConfirmations).toEqual({ increment: 1 });
  });

  it("rejeitar baixa o score com -5", async () => {
    mocks.trustScore.findUnique.mockResolvedValue({ score: 8 });

    const r = await recordValidation({
      extractionType: "tarefa",
      action: "rejeitar",
      entityType: "task",
      entityId: "t1",
      performedById: "p1",
    });

    expect(r.scoreAfter).toBe(3);
    const upsertArgs = mocks.trustScore.upsert.mock.calls[0][0];
    expect(upsertArgs.update.score).toBe(3);
    expect(upsertArgs.update.totalRejections).toEqual({ increment: 1 });
  });

  it("clampa em 0 quando rejeitar passa abaixo", async () => {
    mocks.trustScore.findUnique.mockResolvedValue({ score: 2 });
    const r = await recordValidation({
      extractionType: "tarefa",
      action: "rejeitar",
      entityType: "task",
      entityId: "t1",
      performedById: "p1",
    });
    expect(r.scoreAfter).toBe(0);
  });

  it("clampa em 100 quando confirmar passa acima", async () => {
    mocks.trustScore.findUnique.mockResolvedValue({ score: 99 });
    const r = await recordValidation({
      extractionType: "tarefa",
      action: "confirmar",
      entityType: "task",
      entityId: "t1",
      performedById: "p1",
    });
    expect(r.scoreAfter).toBe(100);
  });

  it("usa agentId custom se passado", async () => {
    mocks.trustScore.findUnique.mockResolvedValue(null);
    await recordValidation({
      agentId: "external-agent-x",
      extractionType: "decisao",
      action: "confirmar",
      entityType: "task",
      entityId: "t1",
      performedById: "p1",
    });
    const upsertArgs = mocks.trustScore.upsert.mock.calls[0][0];
    expect(upsertArgs.where.tenantId_agentId_extractionType.agentId).toBe("external-agent-x");
    expect(upsertArgs.create.extractionType).toBe("decisao");
  });

  it("editar mantém o score (delta 0) mas incrementa edits", async () => {
    mocks.trustScore.findUnique.mockResolvedValue({ score: 20 });
    const r = await recordValidation({
      extractionType: "tarefa",
      action: "editar",
      entityType: "task",
      entityId: "t1",
      performedById: "p1",
    });
    expect(r.scoreAfter).toBe(20);
    const upsertArgs = mocks.trustScore.upsert.mock.calls[0][0];
    expect(upsertArgs.update.totalEdits).toEqual({ increment: 1 });
  });

  it("aceita tx externo e não abre transação própria", async () => {
    const externalTx = {
      trustScore: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
      maestroAction: { create: vi.fn() },
    };
    await recordValidation(
      {
        extractionType: "tarefa",
        action: "confirmar",
        entityType: "task",
        entityId: "t1",
        performedById: "p1",
      },
      externalTx as never
    );
    expect(externalTx.trustScore.upsert).toHaveBeenCalled();
    expect(externalTx.maestroAction.create).toHaveBeenCalled();
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });
});
