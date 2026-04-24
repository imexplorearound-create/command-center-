import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => {
  const project = { findFirst: vi.fn() };
  const testCase = { findMany: vi.fn() };
  const tenantDb = { project, testCase };
  return {
    project,
    testCase,
    tenantDb,
    authenticateFeedbackOrAgent: vi.fn(),
    tenantPrisma: vi.fn(() => tenantDb),
  };
});

vi.mock("@/lib/db", () => ({ tenantPrisma: mocks.tenantPrisma }));
vi.mock("@/lib/feedback-auth", () => ({
  authenticateFeedbackOrAgent: mocks.authenticateFeedbackOrAgent,
}));

import { GET } from "../route";

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticateFeedbackOrAgent.mockResolvedValue({
    via: "feedback",
    userId: "u1",
    email: "t@x",
    name: "Tester",
    tenantId: TENANT,
  });
});

function req(url: string) {
  return new NextRequest(url, {
    headers: new Headers({ authorization: "Bearer xxx" }),
  });
}

describe("GET /api/feedback/test-cases", () => {
  it("400 sem projectSlug", async () => {
    const res = await GET(req("http://x/api/feedback/test-cases"));
    expect(res.status).toBe(400);
  });

  it("401 se auth falhar", async () => {
    mocks.authenticateFeedbackOrAgent.mockResolvedValueOnce(
      NextResponse.json({ error: "no" }, { status: 401 }),
    );
    const res = await GET(req("http://x/api/feedback/test-cases?projectSlug=p1"));
    expect(res.status).toBe(401);
  });

  it("404 se projecto não existir", async () => {
    mocks.project.findFirst.mockResolvedValue(null);
    const res = await GET(req("http://x/api/feedback/test-cases?projectSlug=ghost"));
    expect(res.status).toBe(404);
  });

  it("devolve lista de test cases activos com sheet info", async () => {
    mocks.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mocks.testCase.findMany.mockResolvedValue([
      {
        id: "tc-1",
        code: "T-001",
        title: "Login works",
        module: "auth",
        sheet: { id: "s1", title: "Sprint 4" },
      },
      {
        id: "tc-2",
        code: "T-002",
        title: "Logout clears session",
        module: null,
        sheet: { id: "s1", title: "Sprint 4" },
      },
    ]);
    const res = await GET(req("http://x/api/feedback/test-cases?projectSlug=p1"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      count: number;
      testCases: Array<{ code: string; sheetTitle: string }>;
    };
    expect(body.count).toBe(2);
    expect(body.testCases[0]).toMatchObject({ code: "T-001", sheetTitle: "Sprint 4" });
  });
});
