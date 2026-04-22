import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const feedbackItem = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const task = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mockPrisma = { feedbackItem, task };
  return { feedbackItem, task, mockPrisma, requireAdmin: vi.fn(), requireManager: vi.fn() };
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
  requireManager: mocks.requireManager,
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { sendItemToProducer } from "../feedback-actions";

const OK_USER = {
  ok: true as const,
  user: {
    userId: "u1",
    personId: "p1",
    email: "m@x",
    role: "admin" as const,
    name: "Admin",
    projectIds: [],
  },
};
const FAIL_AUTH = { ok: false as const, error: "Sem permissão" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue(OK_USER);
  mocks.requireManager.mockResolvedValue(OK_USER);
});

describe("sendItemToProducer", () => {
  it("falha se sem permissão", async () => {
    mocks.requireManager.mockResolvedValue(FAIL_AUTH);
    const r = await sendItemToProducer("item-1");
    expect("error" in r && r.error).toBe("Sem permissão");
  });

  it("falha se item não existe", async () => {
    mocks.feedbackItem.findUnique.mockResolvedValue(null);
    const r = await sendItemToProducer("nope");
    expect("error" in r && r.error).toMatch(/não encontrado/i);
  });

  it("falha se item não triado (sem priority)", async () => {
    mocks.feedbackItem.findUnique.mockResolvedValue({
      id: "it-1",
      taskId: null,
      priority: null,
      sessionId: "s-1",
    });
    const r = await sendItemToProducer("it-1");
    expect("error" in r && r.error).toMatch(/triagem/i);
  });

  it("marca handoff queued quando item já tem task", async () => {
    mocks.feedbackItem.findUnique.mockResolvedValue({
      id: "it-1",
      taskId: "task-existing",
      priority: "alta",
      sessionId: "s-1",
    });
    mocks.task.update.mockResolvedValue({ id: "task-existing" });

    const r = await sendItemToProducer("it-1", "bruno");
    expect("success" in r && r.success).toBe(true);
    expect("data" in r && r.data?.taskId).toBe("task-existing");
    expect(mocks.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-existing" },
        data: expect.objectContaining({
          handoffStatus: "queued",
          handoffAgentId: "bruno",
        }),
      })
    );
  });

  it("converte em task automaticamente se ainda não existe", async () => {
    // Primeira chamada: findUnique inicial (sem select) — devolve sem task
    // Segunda chamada (dentro de convertFeedbackToTask): findUnique com include
    mocks.feedbackItem.findUnique
      .mockResolvedValueOnce({
        id: "it-2",
        taskId: null,
        priority: "media",
        sessionId: "s-2",
      })
      .mockResolvedValueOnce({
        id: "it-2",
        taskId: null,
        priority: "media",
        voiceTranscript: "bug",
        pageTitle: "home",
        pageUrl: "/",
        acceptanceCriteria: null,
        reproSteps: [],
        expectedResult: null,
        actualResult: null,
        classification: null,
        screenshotUrl: null,
        session: {
          projectId: "proj-1",
          testerName: "T",
          project: { slug: "p" },
        },
      });
    mocks.task.create.mockResolvedValue({ id: "task-new" });
    mocks.feedbackItem.update.mockResolvedValue({});
    mocks.task.update.mockResolvedValue({ id: "task-new" });

    const r = await sendItemToProducer("it-2");
    expect("success" in r && r.success).toBe(true);
    expect("data" in r && r.data?.taskId).toBe("task-new");
    expect(mocks.task.create).toHaveBeenCalled();
    expect(mocks.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-new" },
        data: expect.objectContaining({ handoffStatus: "queued" }),
      })
    );
  });
});
