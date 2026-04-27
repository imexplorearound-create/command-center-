import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { mockResolveTargets, mockRunForUser } = vi.hoisted(() => ({
  mockResolveTargets: vi.fn(),
  mockRunForUser: vi.fn(),
}));

vi.mock("@/lib/maestro/briefing/scheduler", () => ({
  resolveBriefingTargets: mockResolveTargets,
}));
vi.mock("@/lib/maestro/briefing/runner", () => ({
  runBriefingForUser: mockRunForUser,
}));

import { POST } from "../generate/route";

function makeRequest(body: object | null, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/maestro/briefing/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: body === null ? "" : JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BRIEFING_CRON_SECRET = "test-secret";
  mockResolveTargets.mockResolvedValue([]);
});

describe("POST /api/maestro/briefing/generate", () => {
  it("401 sem Bearer", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("401 com Bearer errado", async () => {
    const res = await POST(makeRequest({}, { authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("503 se BRIEFING_CRON_SECRET não definido", async () => {
    delete process.env.BRIEFING_CRON_SECRET;
    const res = await POST(makeRequest({}, { authorization: "Bearer x" }));
    expect(res.status).toBe(503);
  });

  it("400 se body inválido", async () => {
    const res = await POST(
      makeRequest({ tenantId: "not-a-uuid" }, { authorization: "Bearer test-secret" }),
    );
    expect(res.status).toBe(400);
  });

  it("200 sem targets devolve zeros", async () => {
    const res = await POST(
      makeRequest({}, { authorization: "Bearer test-secret" }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      processed: 0,
      delivered: 0,
      skippedEmpty: 0,
      skippedExisting: 0,
      failed: 0,
    });
  });

  it("agrega resultados dos targets", async () => {
    mockResolveTargets.mockResolvedValue([
      { tenant: { id: "t1" }, user: { id: "u1" } },
      { tenant: { id: "t1" }, user: { id: "u2" } },
      { tenant: { id: "t1" }, user: { id: "u3" } },
    ]);
    mockRunForUser
      .mockResolvedValueOnce({ status: "delivered", briefingId: "b1" })
      .mockResolvedValueOnce({ status: "skipped_empty", briefingId: "b2" })
      .mockResolvedValueOnce({ status: "failed", error: "boom" });

    const res = await POST(
      makeRequest(
        { force: true },
        { authorization: "Bearer test-secret" },
      ),
    );
    const data = await res.json();
    expect(data.processed).toBe(3);
    expect(data.delivered).toBe(1);
    expect(data.skippedEmpty).toBe(1);
    expect(data.failed).toBe(1);
    expect(data.errors).toEqual([{ userId: "u3", error: "boom" }]);
  });

  it("propaga force/userId/tenantId ao scheduler", async () => {
    const tid = "11111111-1111-4111-8111-111111111111";
    const uid = "22222222-2222-4222-8222-222222222222";
    await POST(
      makeRequest(
        { tenantId: tid, userId: uid, force: true },
        { authorization: "Bearer test-secret" },
      ),
    );
    expect(mockResolveTargets).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantIdFilter: tid,
        userIdFilter: uid,
        force: true,
      }),
    );
  });

  it("aceita body vazio", async () => {
    const res = await POST(
      makeRequest(null, { authorization: "Bearer test-secret", "content-length": "0" }),
    );
    expect(res.status).toBe(200);
  });
});
