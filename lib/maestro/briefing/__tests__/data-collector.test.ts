import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { collectBriefingData, isBriefingDataEmpty } from "../data-collector";
import type { BriefingTenant, BriefingUser, CollectorContext } from "../data-collector";

type MockDb = {
  task: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  feedbackItem: { count: ReturnType<typeof vi.fn> };
  decision: { count: ReturnType<typeof vi.fn> };
  userProjectAccess: { findMany: ReturnType<typeof vi.fn> };
  maestroAction: { findMany: ReturnType<typeof vi.fn> };
};

function createDb(): MockDb {
  return {
    task: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    feedbackItem: { count: vi.fn().mockResolvedValue(0) },
    decision: { count: vi.fn().mockResolvedValue(0) },
    userProjectAccess: { findMany: vi.fn().mockResolvedValue([]) },
    maestroAction: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

const tenant: BriefingTenant = {
  id: "t1",
  name: "Tenant Demo",
  locale: "pt-PT",
  timezone: "Europe/Lisbon",
};

const adminUser: BriefingUser = {
  id: "u-admin",
  role: "admin",
  name: "Miguel",
  personId: "p-admin",
};

const memberUser: BriefingUser = {
  id: "u-membro",
  role: "membro",
  name: "Membro",
  personId: "p-membro",
};

function ctx(user: BriefingUser, now = new Date("2026-04-27T10:00:00Z")): CollectorContext {
  return { tenant, user, now };
}

describe("collectBriefingData", () => {
  let db: MockDb;
  beforeEach(() => {
    db = createDb();
  });

  it("devolve estrutura vazia quando não há dados", async () => {
    const data = await collectBriefingData(db as never, ctx(adminUser));
    expect(data.overdueTasks).toEqual([]);
    expect(data.dueSoonTasks).toEqual([]);
    expect(data.pendingValidations).toEqual([]);
    expect(data.recentChanges).toEqual({
      tasksCreated: 0,
      tasksCompleted: 0,
      feedbackItemsNew: 0,
      decisionsResolved: 0,
    });
    expect(data.trustDeltas).toEqual([]);
    expect(isBriefingDataEmpty(data)).toBe(true);
  });

  it("classifica tarefas vencidas com daysLate correcto", async () => {
    db.task.findMany
      .mockResolvedValueOnce([
        {
          id: "t1",
          title: "Vencida",
          deadline: new Date("2026-04-25"),
          priority: "alta",
          project: { slug: "demo", name: "Demo" },
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const data = await collectBriefingData(db as never, ctx(adminUser));
    expect(data.overdueTasks).toHaveLength(1);
    expect(data.overdueTasks[0]).toMatchObject({
      id: "t1",
      title: "Vencida",
      projectSlug: "demo",
      daysLate: 2,
    });
    expect(isBriefingDataEmpty(data)).toBe(false);
  });

  it("classifica tarefas com deadline próximo (≤3 dias)", async () => {
    db.task.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "t2",
          title: "Próxima",
          deadline: new Date("2026-04-29"),
          priority: "media",
          project: null,
        },
      ])
      .mockResolvedValueOnce([]);

    const data = await collectBriefingData(db as never, ctx(adminUser));
    expect(data.dueSoonTasks).toHaveLength(1);
    expect(data.dueSoonTasks[0].daysUntil).toBe(2);
    expect(data.dueSoonTasks[0].projectSlug).toBeNull();
  });

  it("admin vê pendingValidations sem filtro de assignee", async () => {
    db.task.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "v1", title: "Por validar", createdAt: new Date("2026-04-26T08:00:00Z") },
      ]);

    const data = await collectBriefingData(db as never, ctx(adminUser));
    const lastCall = db.task.findMany.mock.calls.at(-1)?.[0];
    expect(lastCall.where.validationStatus).toBe("por_confirmar");
    expect(lastCall.where.assigneeId).toBeUndefined();
    expect(data.pendingValidations).toHaveLength(1);
    expect(data.pendingValidations[0].kind).toBe("task");
  });

  it("membro filtra pendingValidations pelo seu personId e project access", async () => {
    db.userProjectAccess.findMany.mockResolvedValueOnce([{ projectId: "proj-1" }]);
    db.task.findMany.mockResolvedValue([]);

    await collectBriefingData(db as never, ctx(memberUser));
    const validationsCall = db.task.findMany.mock.calls[2]?.[0];
    expect(validationsCall.where.assigneeId).toBe("p-membro");
    expect(validationsCall.where.OR).toEqual([
      { projectId: { in: ["proj-1"] } },
      { projectId: null },
    ]);
  });

  it("agrega trustDeltas só para admin", async () => {
    db.maestroAction.findMany.mockResolvedValue([
      { extractionType: "tarefa", scoreDelta: 2 },
      { extractionType: "tarefa", scoreDelta: -5 },
      { extractionType: "decisao", scoreDelta: 2 },
    ]);

    const data = await collectBriefingData(db as never, ctx(adminUser));
    expect(data.trustDeltas).toEqual(
      expect.arrayContaining([
        { extractionType: "tarefa", delta: -3 },
        { extractionType: "decisao", delta: 2 },
      ]),
    );
  });

  it("não agrega trustDeltas para membro", async () => {
    const data = await collectBriefingData(db as never, ctx(memberUser));
    expect(db.maestroAction.findMany).not.toHaveBeenCalled();
    expect(data.trustDeltas).toEqual([]);
  });

  it("admin/manager contam feedbackItems e decisões; membro não", async () => {
    db.feedbackItem.count.mockResolvedValue(7);
    db.decision.count.mockResolvedValue(3);
    db.task.count.mockResolvedValue(0);

    const adminData = await collectBriefingData(db as never, ctx(adminUser));
    expect(adminData.recentChanges.feedbackItemsNew).toBe(7);
    expect(adminData.recentChanges.decisionsResolved).toBe(3);

    db.feedbackItem.count.mockClear();
    db.decision.count.mockClear();
    const memberData = await collectBriefingData(db as never, ctx(memberUser));
    expect(db.feedbackItem.count).not.toHaveBeenCalled();
    expect(db.decision.count).not.toHaveBeenCalled();
    expect(memberData.recentChanges.feedbackItemsNew).toBe(0);
  });
});

describe("isBriefingDataEmpty", () => {
  it("é true quando todas as listas estão vazias e contadores a 0", () => {
    expect(
      isBriefingDataEmpty({
        user: adminUser,
        tenant,
        overdueTasks: [],
        dueSoonTasks: [],
        pendingValidations: [],
        recentChanges: {
          tasksCreated: 0,
          tasksCompleted: 0,
          feedbackItemsNew: 0,
          decisionsResolved: 0,
        },
        trustDeltas: [],
      }),
    ).toBe(true);
  });

  it("é false se houver pelo menos um item", () => {
    expect(
      isBriefingDataEmpty({
        user: adminUser,
        tenant,
        overdueTasks: [],
        dueSoonTasks: [],
        pendingValidations: [],
        recentChanges: {
          tasksCreated: 1,
          tasksCompleted: 0,
          feedbackItemsNew: 0,
          decisionsResolved: 0,
        },
        trustDeltas: [],
      }),
    ).toBe(false);
  });
});
