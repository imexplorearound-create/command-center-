import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { mockBasePrisma, mockRecordDecay } = vi.hoisted(() => {
  return {
    mockBasePrisma: {
      trustScore: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
        return callback({}); // pass empty tx to recordDecay (it's mocked)
      }),
    },
    mockRecordDecay: vi.fn().mockResolvedValue({
      scoreBefore: 0,
      scoreAfter: 0,
      delta: -1,
    }),
  };
});

vi.mock("@/lib/db", () => ({
  basePrisma: mockBasePrisma,
}));
vi.mock("@/lib/maestro/score-engine", () => ({
  recordDecay: mockRecordDecay,
}));

import { runDecay } from "../decay/runner";

const NOW = new Date("2026-04-28T03:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  mockBasePrisma.trustScore.findMany.mockResolvedValue([]);
  mockBasePrisma.$transaction.mockImplementation(
    async (callback: (tx: unknown) => Promise<unknown>) => callback({}),
  );
  mockRecordDecay.mockResolvedValue({ scoreBefore: 0, scoreAfter: 0, delta: -1 });
});

describe("runDecay — query filter", () => {
  it("usa cutoff = now - 7 dias por defeito", async () => {
    await runDecay({ now: NOW });

    expect(mockBasePrisma.trustScore.findMany).toHaveBeenCalledTimes(1);
    const call = mockBasePrisma.trustScore.findMany.mock.calls[0][0];
    const expectedCutoff = new Date(NOW.getTime() - 7 * DAY_MS);
    expect(call.where.lastInteractionAt.lt.getTime()).toBe(expectedCutoff.getTime());
    expect(call.where.lastInteractionAt.not).toBeNull();
    expect(call.where.score).toEqual({ gt: 0 });
  });

  it("aceita cooldownDays customizado", async () => {
    await runDecay({ now: NOW, cooldownDays: 14 });

    const call = mockBasePrisma.trustScore.findMany.mock.calls[0][0];
    const expectedCutoff = new Date(NOW.getTime() - 14 * DAY_MS);
    expect(call.where.lastInteractionAt.lt.getTime()).toBe(expectedCutoff.getTime());
  });

  it("filtra por tenantId quando passado", async () => {
    await runDecay({ now: NOW, tenantId: "tenant-abc" });

    const call = mockBasePrisma.trustScore.findMany.mock.calls[0][0];
    expect(call.where.tenantId).toBe("tenant-abc");
  });

  it("sem tenantId não inclui filter de tenant", async () => {
    await runDecay({ now: NOW });

    const call = mockBasePrisma.trustScore.findMany.mock.calls[0][0];
    expect(call.where.tenantId).toBeUndefined();
  });
});

describe("runDecay — sem candidatos", () => {
  it("devolve processed=0 quando findMany retorna []", async () => {
    mockBasePrisma.trustScore.findMany.mockResolvedValue([]);

    const r = await runDecay({ now: NOW });
    expect(r.processed).toBe(0);
    expect(r.decayed).toBe(0);
    expect(mockRecordDecay).not.toHaveBeenCalled();
  });
});

describe("runDecay — execução normal", () => {
  it("chama recordDecay para cada candidato", async () => {
    const candidates = [
      {
        id: "ts-1",
        tenantId: "t1",
        agentId: "maestro-internal",
        extractionType: "tarefa",
        score: 50,
        lastInteractionAt: new Date("2026-04-15T00:00:00Z"),
      },
      {
        id: "ts-2",
        tenantId: "t1",
        agentId: "maestro-chat",
        extractionType: "decisao",
        score: 10,
        lastInteractionAt: new Date("2026-03-01T00:00:00Z"),
      },
    ];
    mockBasePrisma.trustScore.findMany.mockResolvedValue(candidates);

    const r = await runDecay({ now: NOW });
    expect(r.processed).toBe(2);
    expect(r.decayed).toBe(2);
    expect(mockRecordDecay).toHaveBeenCalledTimes(2);

    const firstCall = mockRecordDecay.mock.calls[0][0];
    expect(firstCall).toMatchObject({
      trustScoreId: expect.any(String),
      tenantId: "t1",
      scoreBefore: expect.any(Number),
    });
  });

  it("score=1 → recordDecay com scoreBefore=1 (clamp leva a 0)", async () => {
    mockBasePrisma.trustScore.findMany.mockResolvedValue([
      {
        id: "ts-edge",
        tenantId: "t1",
        agentId: "maestro-internal",
        extractionType: "tarefa",
        score: 1,
        lastInteractionAt: new Date("2026-04-01T00:00:00Z"),
      },
    ]);

    const r = await runDecay({ now: NOW });
    expect(r.decayed).toBe(1);
    expect(mockRecordDecay).toHaveBeenCalledWith(
      expect.objectContaining({ trustScoreId: "ts-edge", scoreBefore: 1 }),
      expect.anything(),
    );
  });

  it("captura erro de recordDecay sem parar outros workers", async () => {
    mockBasePrisma.trustScore.findMany.mockResolvedValue([
      {
        id: "ts-fail",
        tenantId: "t1",
        agentId: "maestro-internal",
        extractionType: "tarefa",
        score: 50,
        lastInteractionAt: new Date("2026-04-15T00:00:00Z"),
      },
      {
        id: "ts-ok",
        tenantId: "t1",
        agentId: "maestro-internal",
        extractionType: "decisao",
        score: 30,
        lastInteractionAt: new Date("2026-04-15T00:00:00Z"),
      },
    ]);
    mockRecordDecay
      .mockRejectedValueOnce(new Error("DB connection lost"))
      .mockResolvedValueOnce({ scoreBefore: 30, scoreAfter: 29, delta: -1 });

    const r = await runDecay({ now: NOW });
    expect(r.processed).toBe(2);
    expect(r.decayed).toBe(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].error).toContain("DB connection lost");
  });

  it("score=0 do findMany (race condition) → skippedZero", async () => {
    mockBasePrisma.trustScore.findMany.mockResolvedValue([
      {
        id: "ts-race",
        tenantId: "t1",
        agentId: "maestro-internal",
        extractionType: "tarefa",
        score: 0,
        lastInteractionAt: new Date("2026-04-15T00:00:00Z"),
      },
    ]);

    const r = await runDecay({ now: NOW });
    expect(r.processed).toBe(1);
    expect(r.decayed).toBe(0);
    expect(r.skippedZero).toBe(1);
    expect(mockRecordDecay).not.toHaveBeenCalled();
  });
});

describe("runDecay — dryRun", () => {
  it("não chama recordDecay e devolve candidates", async () => {
    const candidates = [
      {
        id: "ts-1",
        tenantId: "t1",
        agentId: "maestro-internal",
        extractionType: "tarefa",
        score: 50,
        lastInteractionAt: new Date("2026-04-15T00:00:00Z"),
      },
    ];
    mockBasePrisma.trustScore.findMany.mockResolvedValue(candidates);

    const r = await runDecay({ now: NOW, dryRun: true });
    expect(r.processed).toBe(1);
    expect(r.decayed).toBe(0);
    expect(r.candidates).toEqual(candidates);
    expect(mockRecordDecay).not.toHaveBeenCalled();
    expect(mockBasePrisma.$transaction).not.toHaveBeenCalled();
  });

  it("dryRun com lista vazia devolve candidates: []", async () => {
    mockBasePrisma.trustScore.findMany.mockResolvedValue([]);

    const r = await runDecay({ now: NOW, dryRun: true });
    expect(r.processed).toBe(0);
    expect(r.candidates).toEqual([]);
  });
});
