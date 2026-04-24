import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import {
  TEST_TENANT_UUID as TENANT,
  TEST_TASK_UUID as TASK_ID,
  TEST_TEST_CASE_UUID as TEST_CASE_ID,
} from "@/lib/__tests__/test-uuids";

const mocks = vi.hoisted(() => {
  const task = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  };
  const feedbackItem = {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  };
  const devApiKey = {
    findUnique: vi.fn(),
    update: vi.fn(() => ({ catch: () => {} })),
  };
  const tenantDb = { task, feedbackItem };
  return {
    task,
    feedbackItem,
    devApiKey,
    tenantDb,
    basePrisma: { devApiKey },
    tenantPrisma: vi.fn(() => tenantDb),
    notifyReadyForVerification: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  basePrisma: mocks.basePrisma,
  tenantPrisma: mocks.tenantPrisma,
}));
vi.mock(
  "@/lib/notifications/feedback-ready-for-verification-notifier",
  () => ({ notifyReadyForVerification: mocks.notifyReadyForVerification }),
);

import { GET as listGet } from "../route";
import { GET as detailGet } from "../[id]/route";
import { PATCH as statusPatch } from "../[id]/status/route";
import { generateDevApiKey } from "@/lib/dev-api-key";

const ORIGINAL_PEPPER = process.env.DEV_API_KEY_PEPPER;
beforeAll(() => {
  process.env.DEV_API_KEY_PEPPER = "test-pepper";
});
afterAll(() => {
  process.env.DEV_API_KEY_PEPPER = ORIGINAL_PEPPER;
});

const { token: VALID_TOKEN } = generateDevApiKey();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.devApiKey.findUnique.mockResolvedValue({
    id: "key-1",
    tenantId: TENANT,
    personId: null,
    scopes: ["tasks:read", "tasks:write", "feedback:read"],
    revokedAt: null,
    expiresAt: null,
    lastUsedAt: new Date(),
  });
});

function makeReq(
  url: string,
  init: { method?: string; body?: unknown } = {},
) {
  return new NextRequest(url, {
    method: init.method,
    body: init.body ? JSON.stringify(init.body) : undefined,
    headers: new Headers({
      authorization: `Bearer ${VALID_TOKEN}`,
      "content-type": "application/json",
    }),
  });
}

describe("GET /api/dev/tasks", () => {
  it("403 sem scope tasks:read", async () => {
    mocks.devApiKey.findUnique.mockResolvedValueOnce({
      id: "key-1",
      tenantId: TENANT,
      personId: null,
      scopes: ["testsheets:read"],
      revokedAt: null,
      expiresAt: null,
      lastUsedAt: new Date(),
    });
    const res = await listGet(makeReq("http://x/api/dev/tasks"));
    expect(res.status).toBe(403);
  });

  it("devolve queue com filtro default (approved + in_dev)", async () => {
    mocks.task.findMany.mockResolvedValue([
      {
        id: TASK_ID,
        title: "Fix login",
        priority: "alta",
        createdAt: new Date(),
        updatedAt: new Date(),
        project: { slug: "p1", name: "P1" },
        testCase: { id: TEST_CASE_ID, code: "T-001", title: "Login" },
        feedbackItems: [
          { id: "f1", approvalStatus: "approved", priority: "alta", pageUrl: "/login", verifyRejectionsCount: 0 },
        ],
      },
    ]);
    const res = await listGet(makeReq("http://x/api/dev/tasks"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number; tasks: Array<{ approvalStatus: string }> };
    expect(body.count).toBe(1);
    expect(body.tasks[0]!.approvalStatus).toBe("approved");
    const call = mocks.task.findMany.mock.calls[0]![0];
    expect(call.where.feedbackItems.some.approvalStatus.in).toEqual(["approved", "in_dev"]);
  });

  it("respeita filtro status=ready_for_verification", async () => {
    mocks.task.findMany.mockResolvedValue([]);
    await listGet(makeReq("http://x/api/dev/tasks?status=ready_for_verification"));
    const call = mocks.task.findMany.mock.calls[0]![0];
    expect(call.where.feedbackItems.some.approvalStatus.in).toEqual(["ready_for_verification"]);
  });

  it("400 se status inválido", async () => {
    const res = await listGet(makeReq("http://x/api/dev/tasks?status=bogus"));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/dev/tasks/[id]", () => {
  it("404 se task não existe", async () => {
    mocks.task.findFirst.mockResolvedValue(null);
    const res = await detailGet(makeReq(`http://x/api/dev/tasks/${TASK_ID}`), {
      params: Promise.resolve({ id: TASK_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("devolve full context com feedbacks", async () => {
    mocks.task.findFirst.mockResolvedValue({
      id: TASK_ID,
      title: "Fix login",
      description: null,
      priority: "alta",
      status: "a_fazer",
      createdAt: new Date(),
      updatedAt: new Date(),
      project: { slug: "p1", name: "P1" },
      testCase: {
        id: TEST_CASE_ID,
        code: "T-001",
        title: "Login",
        description: null,
        expectedResult: "Logs in",
        module: "auth",
        archivedAt: null,
      },
      feedbackItems: [
        {
          id: "f1",
          approvalStatus: "in_dev",
          classification: "bug",
          priority: "alta",
          module: "auth",
          pageUrl: "/login",
          pageTitle: "Login",
          voiceTranscript: "botão não reage",
          voiceAudioUrl: null,
          screenshotUrl: null,
          contextSnapshot: null,
          expectedResult: null,
          actualResult: null,
          reproSteps: [],
          acceptanceCriteria: null,
          mentionedTestCaseCodes: [],
          rejectionReason: null,
          rejectionOrigin: null,
          verifyRejectionsCount: 0,
          createdAt: new Date(),
        },
      ],
    });
    const res = await detailGet(makeReq(`http://x/api/dev/tasks/${TASK_ID}`), {
      params: Promise.resolve({ id: TASK_ID }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { task: { feedbacks: unknown[] } };
    expect(body.task.feedbacks).toHaveLength(1);
  });
});

describe("PATCH /api/dev/tasks/[id]/status", () => {
  it("403 sem scope tasks:write", async () => {
    mocks.devApiKey.findUnique.mockResolvedValueOnce({
      id: "key-1",
      tenantId: TENANT,
      personId: null,
      scopes: ["tasks:read"],
      revokedAt: null,
      expiresAt: null,
      lastUsedAt: new Date(),
    });
    const res = await statusPatch(
      makeReq(`http://x/api/dev/tasks/${TASK_ID}/status`, {
        method: "PATCH",
        body: { status: "in_dev" },
      }),
      { params: Promise.resolve({ id: TASK_ID }) },
    );
    expect(res.status).toBe(403);
  });

  it("400 se body inválido (status missing)", async () => {
    mocks.task.findFirst.mockResolvedValue({ id: TASK_ID });
    const res = await statusPatch(
      makeReq(`http://x/api/dev/tasks/${TASK_ID}/status`, {
        method: "PATCH",
        body: {},
      }),
      { params: Promise.resolve({ id: TASK_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it("400 se reject sem rejectionReason", async () => {
    mocks.task.findFirst.mockResolvedValue({ id: TASK_ID });
    const res = await statusPatch(
      makeReq(`http://x/api/dev/tasks/${TASK_ID}/status`, {
        method: "PATCH",
        body: { status: "needs_review" },
      }),
      { params: Promise.resolve({ id: TASK_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it("404 se task não existe", async () => {
    mocks.task.findFirst.mockResolvedValue(null);
    const res = await statusPatch(
      makeReq(`http://x/api/dev/tasks/${TASK_ID}/status`, {
        method: "PATCH",
        body: { status: "in_dev" },
      }),
      { params: Promise.resolve({ id: TASK_ID }) },
    );
    expect(res.status).toBe(404);
  });

  it("200 em approved → in_dev", async () => {
    mocks.task.findFirst.mockResolvedValue({ id: TASK_ID });
    mocks.feedbackItem.findMany.mockResolvedValue([
      { id: "f1", approvalStatus: "approved" },
    ]);
    mocks.feedbackItem.updateMany.mockResolvedValue({ count: 1 });
    const res = await statusPatch(
      makeReq(`http://x/api/dev/tasks/${TASK_ID}/status`, {
        method: "PATCH",
        body: { status: "in_dev" },
      }),
      { params: Promise.resolve({ id: TASK_ID }) },
    );
    expect(res.status).toBe(200);
  });

  it("409 em transição inválida (approved → ready_for_verification)", async () => {
    mocks.task.findFirst.mockResolvedValue({ id: TASK_ID });
    mocks.feedbackItem.findMany.mockResolvedValue([
      { id: "f1", approvalStatus: "approved" },
    ]);
    const res = await statusPatch(
      makeReq(`http://x/api/dev/tasks/${TASK_ID}/status`, {
        method: "PATCH",
        body: { status: "ready_for_verification" },
      }),
      { params: Promise.resolve({ id: TASK_ID }) },
    );
    expect(res.status).toBe(409);
  });

  it("ready_for_verification dispara notifier (fire-and-forget)", async () => {
    mocks.task.findFirst.mockResolvedValue({ id: TASK_ID });
    mocks.feedbackItem.findMany.mockResolvedValue([
      { id: "f1", approvalStatus: "in_dev" },
    ]);
    mocks.feedbackItem.updateMany.mockResolvedValue({ count: 1 });
    const res = await statusPatch(
      makeReq(`http://x/api/dev/tasks/${TASK_ID}/status`, {
        method: "PATCH",
        body: { status: "ready_for_verification" },
      }),
      { params: Promise.resolve({ id: TASK_ID }) },
    );
    expect(res.status).toBe(200);
    // Fire-and-forget: notifier is called asynchronously; just verify the
    // function was called (defer wraps it in .catch).
    await new Promise((r) => setImmediate(r));
    expect(mocks.notifyReadyForVerification).toHaveBeenCalled();
  });
});

