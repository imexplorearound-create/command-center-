import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const feedbackItem = {
    findFirst: vi.fn(),
    update: vi.fn(),
  };
  const task = {
    findFirst: vi.fn(),
    update: vi.fn(),
  };
  const mockPrisma = {
    feedbackItem,
    task,
    $queryRaw: vi.fn(),
  };
  return {
    feedbackItem,
    task,
    mockPrisma,
    requireWriter: vi.fn(),
    findOrCreateOpenTaskForTestCase: vi.fn(),
    deferTaskDraft: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ basePrisma: mocks.mockPrisma }));
vi.mock("@/lib/tenant", () => ({
  getTenantDb: vi.fn().mockResolvedValue(mocks.mockPrisma),
}));
vi.mock("@/lib/auth/dal", () => ({
  requireWriter: mocks.requireWriter,
}));
vi.mock("../find-or-create-open-task", () => ({
  findOrCreateOpenTaskForTestCase: mocks.findOrCreateOpenTaskForTestCase,
}));
vi.mock("../defer-task-draft", () => ({
  deferTaskDraft: mocks.deferTaskDraft,
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  approveFeedback,
  rejectFeedback,
  archiveFeedback,
} from "../feedback-approval-actions";

import {
  TEST_TENANT_UUID as TENANT,
  TEST_PROJECT_UUID as PROJECT_ID,
  TEST_FEEDBACK_UUID as FEEDBACK_ID,
  TEST_FEEDBACK_UUID_2,
  TEST_TEST_CASE_UUID as TEST_CASE_ID,
  TEST_TASK_UUID as TASK_ID,
} from "@/lib/__tests__/test-uuids";

function baseItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: FEEDBACK_ID,
    tenantId: TENANT,
    testCaseId: TEST_CASE_ID,
    taskId: null,
    approvalStatus: "needs_review",
    priority: "media",
    aiSummary: "O botão X não responde",
    voiceTranscript: "O botão não faz nada quando clico",
    session: { projectId: PROJECT_ID },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWriter.mockResolvedValue({
    ok: true,
    user: {
      userId: "u1",
      personId: "p1",
      email: "m@x",
      name: "Miguel",
      role: "admin",
      tenantId: TENANT,
      projectIds: [],
    },
  });
});

describe("approveFeedback", () => {
  it("rejeita se caller não for writer", async () => {
    mocks.requireWriter.mockResolvedValueOnce({ ok: false, error: "Sem permissão" });
    const fd = new FormData();
    fd.set("feedbackItemId", FEEDBACK_ID);
    const r = await approveFeedback(undefined, fd);
    expect(r).toEqual({ error: "Sem permissão" });
  });

  it("rejeita se feedback não tem testCaseId", async () => {
    mocks.feedbackItem.findFirst.mockResolvedValue(baseItem({ testCaseId: null }));
    const fd = new FormData();
    fd.set("feedbackItemId", FEEDBACK_ID);
    const r = await approveFeedback(undefined, fd);
    expect(r).toEqual({ error: "Atribui um TestCase antes de aprovar" });
    expect(mocks.findOrCreateOpenTaskForTestCase).not.toHaveBeenCalled();
  });

  it("rejeita se approvalStatus != needs_review", async () => {
    mocks.feedbackItem.findFirst.mockResolvedValue(baseItem({ approvalStatus: "approved" }));
    const fd = new FormData();
    fd.set("feedbackItemId", FEEDBACK_ID);
    const r = await approveFeedback(undefined, fd);
    expect(r).toMatchObject({ error: expect.stringContaining("Já foi") });
  });

  it("aprova, chama upsert helper e liga taskId", async () => {
    mocks.feedbackItem.findFirst.mockResolvedValue(baseItem());
    mocks.findOrCreateOpenTaskForTestCase.mockResolvedValue({
      id: TASK_ID,
      created: true,
    });
    mocks.feedbackItem.update.mockResolvedValue({});

    const fd = new FormData();
    fd.set("feedbackItemId", FEEDBACK_ID);
    const r = await approveFeedback(undefined, fd);

    expect(r).toEqual({ success: true, data: { taskId: TASK_ID } });
    expect(mocks.findOrCreateOpenTaskForTestCase).toHaveBeenCalledWith(
      mocks.mockPrisma,
      expect.objectContaining({
        tenantId: TENANT,
        testCaseId: TEST_CASE_ID,
        projectId: PROJECT_ID,
        origin: "feedback",
        originRef: FEEDBACK_ID,
      }),
    );
    const update = mocks.feedbackItem.update.mock.calls[0]![0];
    expect(update.data.approvalStatus).toBe("approved");
    expect(update.data.taskId).toBe(TASK_ID);
    expect(update.data.approvedById).toBe("p1");
    expect(update.data.approvedAt).toBeInstanceOf(Date);
    expect(mocks.deferTaskDraft).toHaveBeenCalledWith(mocks.mockPrisma, TASK_ID);
  });

  it("2º feedback aprovado liga à mesma task (created: false)", async () => {
    const secondFeedback = TEST_FEEDBACK_UUID_2;
    mocks.feedbackItem.findFirst.mockResolvedValue(baseItem({ id: secondFeedback }));
    mocks.findOrCreateOpenTaskForTestCase.mockResolvedValue({
      id: TASK_ID,
      created: false,
    });
    mocks.feedbackItem.update.mockResolvedValue({});

    const fd = new FormData();
    fd.set("feedbackItemId", secondFeedback);
    const r = await approveFeedback(undefined, fd);

    expect(r).toEqual({ success: true, data: { taskId: TASK_ID } });
    expect(mocks.feedbackItem.update.mock.calls[0]![0].data.taskId).toBe(TASK_ID);
  });

  it("cliente sem acesso ao projecto → 'Sem permissão'", async () => {
    mocks.requireWriter.mockResolvedValueOnce({
      ok: true,
      user: {
        userId: "u2",
        personId: "p2",
        email: "c@x",
        name: "Cliente",
        role: "cliente",
        tenantId: TENANT,
        projectIds: ["other-project"],
      },
    });
    mocks.feedbackItem.findFirst.mockResolvedValue(baseItem());
    const fd = new FormData();
    fd.set("feedbackItemId", FEEDBACK_ID);
    const r = await approveFeedback(undefined, fd);
    expect(r).toEqual({ error: "Sem permissão para este projecto" });
  });

  it("propaga erro do upsert helper (ex. conflict race)", async () => {
    mocks.feedbackItem.findFirst.mockResolvedValue(baseItem());
    mocks.findOrCreateOpenTaskForTestCase.mockRejectedValue(
      new Error("Task conflict but no open task found — retry approve"),
    );
    const fd = new FormData();
    fd.set("feedbackItemId", FEEDBACK_ID);
    const r = await approveFeedback(undefined, fd);
    expect(r).toMatchObject({ error: expect.stringContaining("retry") });
  });
});

describe("rejectFeedback", () => {
  it("rejeita se feedback já não está em review", async () => {
    mocks.feedbackItem.findFirst.mockResolvedValue(baseItem({ approvalStatus: "approved" }));
    const fd = new FormData();
    fd.set("feedbackItemId", FEEDBACK_ID);
    fd.set("rejectionReason", "fora do scope");
    const r = await rejectFeedback(undefined, fd);
    expect(r).toMatchObject({ error: expect.stringContaining("review") });
  });

  it("arquiva com reason quando em needs_review", async () => {
    mocks.feedbackItem.findFirst.mockResolvedValue(baseItem());
    mocks.feedbackItem.update.mockResolvedValue({});
    const fd = new FormData();
    fd.set("feedbackItemId", FEEDBACK_ID);
    fd.set("rejectionReason", "duplicado");
    const r = await rejectFeedback(undefined, fd);
    expect(r).toEqual({ success: true });
    const update = mocks.feedbackItem.update.mock.calls[0]![0];
    expect(update.data.approvalStatus).toBe("archived");
    expect(update.data.rejectionReason).toBe("duplicado");
  });

  it("requer rejectionReason", async () => {
    const fd = new FormData();
    fd.set("feedbackItemId", FEEDBACK_ID);
    fd.set("rejectionReason", "ok");
    const r = await rejectFeedback(undefined, fd);
    expect(r).toHaveProperty("error");
  });
});

describe("archiveFeedback", () => {
  it("desliga taskId mas mantém Task", async () => {
    mocks.feedbackItem.findFirst.mockResolvedValue(
      baseItem({ approvalStatus: "approved", taskId: TASK_ID }),
    );
    mocks.feedbackItem.update.mockResolvedValue({});
    const fd = new FormData();
    fd.set("feedbackItemId", FEEDBACK_ID);
    const r = await archiveFeedback(undefined, fd);
    expect(r).toEqual({ success: true });
    const update = mocks.feedbackItem.update.mock.calls[0]![0];
    expect(update.data.taskId).toBe(null);
    expect(update.data.approvalStatus).toBe("archived");
  });

  it("rejeita re-arquivar", async () => {
    mocks.feedbackItem.findFirst.mockResolvedValue(baseItem({ approvalStatus: "archived" }));
    const fd = new FormData();
    fd.set("feedbackItemId", FEEDBACK_ID);
    const r = await archiveFeedback(undefined, fd);
    expect(r).toMatchObject({ error: expect.stringContaining("arquivado") });
  });
});
