import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const task = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  };
  const mockPrisma = { task };
  return { task, mockPrisma };
});

vi.mock("@/lib/db", () => ({
  prisma: mocks.mockPrisma,
  basePrisma: mocks.mockPrisma,
}));

vi.mock("@/lib/tenant", () => ({
  resolveHeaderTenant: vi.fn().mockResolvedValue(mocks.mockPrisma),
  getTenantDb: vi.fn().mockResolvedValue(mocks.mockPrisma),
  getTenantId: vi.fn().mockResolvedValue("t1"),
}));

vi.mock("server-only", () => ({}));

import { GET as listGet } from "../route";
import { POST as claimPost } from "../[taskId]/claim/route";
import { POST as resolvePost } from "../[taskId]/resolve/route";
import { POST as rejectPost } from "../[taskId]/reject/route";

const ORIGINAL_SECRET = process.env.AGENT_API_SECRET;

beforeAll(() => {
  process.env.AGENT_API_SECRET = "test-agent-secret";
});

afterAll(() => {
  process.env.AGENT_API_SECRET = ORIGINAL_SECRET;
});

function makeReq(
  url: string,
  init: { method?: string; body?: string; headers?: Record<string, string> } = {}
) {
  const headers = new Headers({
    authorization: "Bearer test-agent-secret",
    "x-agent-id": "bruno",
    "x-tenant-id": "t1",
    ...(init.headers ?? {}),
  });
  return new NextRequest(url, { method: init.method, body: init.body, headers });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/agent/handoffs", () => {
  it("401 sem Bearer", async () => {
    const req = new NextRequest("http://x/api/agent/handoffs", { headers: new Headers() });
    const res = await listGet(req);
    expect(res.status).toBe(401);
  });

  it("devolve lista com bundleUrl", async () => {
    mocks.task.findMany.mockResolvedValue([
      {
        id: "t-1",
        title: "Fix X",
        priority: "alta",
        handoffStatus: "queued",
        handoffSentAt: new Date("2026-04-19T06:00:00Z"),
        project: { slug: "p1" },
        feedbackItems: [{ id: "fi-1", sessionId: "fs-1" }],
      },
    ]);

    const req = makeReq("http://x/api/agent/handoffs?status=queued");
    const res = await listGet(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number; handoffs: unknown[] };
    expect(body.count).toBe(1);
    expect(body.handoffs[0]).toMatchObject({
      taskId: "t-1",
      feedbackItemId: "fi-1",
      feedbackSessionId: "fs-1",
    });
    expect((body.handoffs[0] as { bundleUrl: string }).bundleUrl).toContain(
      "/api/agent/handoffs/t-1/bundle"
    );
  });

  it("400 se status inválido", async () => {
    const req = makeReq("http://x/api/agent/handoffs?status=bogus");
    const res = await listGet(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/agent/handoffs/[taskId]/claim", () => {
  it("200 transita queued→in_progress", async () => {
    mocks.task.findUnique.mockResolvedValue({ id: "t-1", handoffStatus: "queued", handoffAgentId: null });
    mocks.task.update.mockResolvedValue({});

    const req = makeReq("http://x/api/agent/handoffs/t-1/claim", { method: "POST" });
    const res = await claimPost(req, { params: Promise.resolve({ taskId: "t-1" }) });
    expect(res.status).toBe(200);
    expect(mocks.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t-1" },
        data: expect.objectContaining({ handoffStatus: "in_progress", handoffAgentId: "bruno" }),
      })
    );
  });

  it("409 se status não claimable", async () => {
    mocks.task.findUnique.mockResolvedValue({ id: "t-1", handoffStatus: "resolved" });
    const req = makeReq("http://x/api/agent/handoffs/t-1/claim", { method: "POST" });
    const res = await claimPost(req, { params: Promise.resolve({ taskId: "t-1" }) });
    expect(res.status).toBe(409);
  });

  it("404 se task não existe", async () => {
    mocks.task.findUnique.mockResolvedValue(null);
    const req = makeReq("http://x/api/agent/handoffs/nope/claim", { method: "POST" });
    const res = await claimPost(req, { params: Promise.resolve({ taskId: "nope" }) });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/agent/handoffs/[taskId]/resolve", () => {
  it("200 e marca task feito", async () => {
    mocks.task.findUnique.mockResolvedValue({ id: "t-1", handoffStatus: "in_progress" });
    mocks.task.update.mockResolvedValue({});

    const req = makeReq("http://x/api/agent/handoffs/t-1/resolve", {
      method: "POST",
      body: JSON.stringify({ commitSha: "abc123" }),
      headers: { "content-type": "application/json" },
    });
    const res = await resolvePost(req, { params: Promise.resolve({ taskId: "t-1" }) });
    expect(res.status).toBe(200);
    expect(mocks.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          handoffStatus: "resolved",
          status: "feito",
          handoffResolution: { commitSha: "abc123" },
        }),
      })
    );
  });

  it("400 se body inválido (deployUrl malformado)", async () => {
    mocks.task.findUnique.mockResolvedValue({ id: "t-1", handoffStatus: "in_progress" });
    const req = makeReq("http://x/api/agent/handoffs/t-1/resolve", {
      method: "POST",
      body: JSON.stringify({ deployUrl: "not-a-url" }),
      headers: { "content-type": "application/json" },
    });
    const res = await resolvePost(req, { params: Promise.resolve({ taskId: "t-1" }) });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/agent/handoffs/[taskId]/reject", () => {
  it("200 com reason", async () => {
    mocks.task.findUnique.mockResolvedValue({ id: "t-1", handoffStatus: "queued" });
    mocks.task.update.mockResolvedValue({});

    const req = makeReq("http://x/api/agent/handoffs/t-1/reject", {
      method: "POST",
      body: JSON.stringify({ reason: "falta contexto" }),
      headers: { "content-type": "application/json" },
    });
    const res = await rejectPost(req, { params: Promise.resolve({ taskId: "t-1" }) });
    expect(res.status).toBe(200);
  });

  it("400 sem reason", async () => {
    mocks.task.findUnique.mockResolvedValue({ id: "t-1", handoffStatus: "queued" });
    const req = makeReq("http://x/api/agent/handoffs/t-1/reject", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const res = await rejectPost(req, { params: Promise.resolve({ taskId: "t-1" }) });
    expect(res.status).toBe(400);
  });
});
