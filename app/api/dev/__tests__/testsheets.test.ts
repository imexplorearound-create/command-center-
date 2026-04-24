import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const testSheet = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  };
  const testCase = {
    createManyAndReturn: vi.fn(),
    updateMany: vi.fn(),
  };
  const project = { findFirst: vi.fn() };
  const devApiKey = {
    findUnique: vi.fn(),
    update: vi.fn(() => ({ catch: () => {} })),
  };
  const tenantDb = { testSheet, testCase, project };
  return {
    testSheet,
    testCase,
    project,
    devApiKey,
    tenantDb,
    basePrisma: { devApiKey },
    tenantPrisma: vi.fn(() => tenantDb),
  };
});

vi.mock("@/lib/db", () => ({
  basePrisma: mocks.basePrisma,
  tenantPrisma: mocks.tenantPrisma,
}));

import { GET as listGet, POST as createPost } from "../testsheets/route";
import { GET as sheetGet } from "../testsheets/[id]/route";
import { POST as casesPost } from "../testsheets/[id]/cases/route";

const ORIGINAL_PEPPER = process.env.DEV_API_KEY_PEPPER;
const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SHEET_ID = "11111111-1111-1111-1111-111111111111";
const PROJECT_ID = "22222222-2222-2222-2222-222222222222";

beforeAll(() => {
  process.env.DEV_API_KEY_PEPPER = "test-pepper";
});
afterAll(() => {
  process.env.DEV_API_KEY_PEPPER = ORIGINAL_PEPPER;
});

import { generateDevApiKey } from "@/lib/dev-api-key";
const { token: VALID_TOKEN } = generateDevApiKey();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.devApiKey.findUnique.mockResolvedValue({
    id: "key-1",
    tenantId: TENANT,
    personId: null,
    scopes: ["testsheets:read", "testsheets:write"],
    revokedAt: null,
    expiresAt: null,
    lastUsedAt: new Date(),
  });
});

function makeReq(
  url: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
) {
  const headers = new Headers({
    authorization: `Bearer ${VALID_TOKEN}`,
    "content-type": "application/json",
    ...(init.headers ?? {}),
  });
  return new NextRequest(url, {
    method: init.method,
    body: init.body ? JSON.stringify(init.body) : undefined,
    headers,
  });
}

describe("GET /api/dev/testsheets", () => {
  it("401 sem bearer", async () => {
    const req = new NextRequest("http://x/api/dev/testsheets", { headers: new Headers() });
    const res = await listGet(req);
    expect(res.status).toBe(401);
  });

  it("403 se scope testsheets:read ausente", async () => {
    mocks.devApiKey.findUnique.mockResolvedValueOnce({
      id: "key-1",
      tenantId: TENANT,
      personId: null,
      scopes: ["tasks:read"],
      revokedAt: null,
      expiresAt: null,
      lastUsedAt: new Date(),
    });
    const res = await listGet(makeReq("http://x/api/dev/testsheets"));
    expect(res.status).toBe(403);
  });

  it("devolve lista filtrada por projectSlug", async () => {
    mocks.testSheet.findMany.mockResolvedValue([
      {
        id: SHEET_ID,
        title: "Sprint 4",
        description: null,
        project: { slug: "p1", name: "Project 1" },
        _count: { cases: 3 },
        archivedAt: null,
        createdAt: new Date("2026-04-20T10:00:00Z"),
      },
    ]);
    const res = await listGet(makeReq("http://x/api/dev/testsheets?projectSlug=p1"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { count: number; sheets: unknown[] };
    expect(body.count).toBe(1);
    expect(mocks.testSheet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          project: { slug: "p1" },
          archivedAt: null,
        }),
      }),
    );
  });
});

describe("POST /api/dev/testsheets", () => {
  it("400 se body não é JSON válido", async () => {
    const req = new NextRequest("http://x/api/dev/testsheets", {
      method: "POST",
      body: "not json",
      headers: new Headers({
        authorization: `Bearer ${VALID_TOKEN}`,
        "content-type": "application/json",
      }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(400);
  });

  it("400 se faltam cases", async () => {
    const res = await createPost(
      makeReq("http://x/api/dev/testsheets", {
        method: "POST",
        body: { projectSlug: "p1", title: "Sprint 4" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("404 se projectSlug não existe", async () => {
    mocks.project.findFirst.mockResolvedValue(null);
    const res = await createPost(
      makeReq("http://x/api/dev/testsheets", {
        method: "POST",
        body: {
          projectSlug: "unknown",
          title: "Sprint 4",
          cases: [{ code: "T-001", title: "Login works" }],
        },
      }),
    );
    expect(res.status).toBe(404);
  });

  it("201 com sheet + cases quando tudo OK", async () => {
    mocks.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mocks.testSheet.create.mockResolvedValue({
      id: SHEET_ID,
      title: "Sprint 4",
      cases: [{ id: "c1", code: "T-001", title: "Login works" }],
    });

    const res = await createPost(
      makeReq("http://x/api/dev/testsheets", {
        method: "POST",
        body: {
          projectSlug: "p1",
          title: "Sprint 4",
          cases: [
            { code: "T-001", title: "Login works" },
            { code: "T-002", title: "Logout clears session" },
          ],
        },
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { sheet: { id: string; title: string } };
    expect(body.sheet.id).toBe(SHEET_ID);

    const createCall = mocks.testSheet.create.mock.calls[0]![0];
    expect(createCall.data.projectId).toBe(PROJECT_ID);
    expect(createCall.data.tenantId).toBe("");
    expect(createCall.data.createdByApiKeyId).toBe("key-1");
  });
});

describe("GET /api/dev/testsheets/[id]", () => {
  it("404 se sheet não existe", async () => {
    mocks.testSheet.findFirst.mockResolvedValue(null);
    const res = await sheetGet(makeReq(`http://x/api/dev/testsheets/${SHEET_ID}`), {
      params: Promise.resolve({ id: SHEET_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("200 com cases ordenados por código", async () => {
    mocks.testSheet.findFirst.mockResolvedValue({
      id: SHEET_ID,
      title: "Sprint 4",
      description: null,
      project: { slug: "p1", name: "Project 1" },
      archivedAt: null,
      createdAt: new Date("2026-04-20T10:00:00Z"),
      cases: [
        {
          id: "c1",
          code: "T-001",
          title: "Login works",
          description: null,
          expectedResult: null,
          module: null,
          createdAt: new Date(),
        },
      ],
    });
    const res = await sheetGet(makeReq(`http://x/api/dev/testsheets/${SHEET_ID}`), {
      params: Promise.resolve({ id: SHEET_ID }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sheet: { cases: unknown[] } };
    expect(body.sheet.cases).toHaveLength(1);
  });
});

describe("POST /api/dev/testsheets/[id]/cases", () => {
  it("404 se sheet arquivada", async () => {
    mocks.testSheet.findFirst.mockResolvedValue(null);
    const res = await casesPost(
      makeReq(`http://x/api/dev/testsheets/${SHEET_ID}/cases`, {
        method: "POST",
        body: { cases: [{ code: "T-100", title: "Novo" }] },
      }),
      { params: Promise.resolve({ id: SHEET_ID }) },
    );
    expect(res.status).toBe(404);
  });

  it("201 adiciona cases a sheet existente", async () => {
    mocks.testSheet.findFirst.mockResolvedValue({ id: SHEET_ID });
    mocks.testCase.createManyAndReturn.mockResolvedValue([
      { id: "c2", code: "T-100", title: "Novo caso" },
    ]);
    const res = await casesPost(
      makeReq(`http://x/api/dev/testsheets/${SHEET_ID}/cases`, {
        method: "POST",
        body: { cases: [{ code: "T-100", title: "Novo caso" }] },
      }),
      { params: Promise.resolve({ id: SHEET_ID }) },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { cases: { code: string }[] };
    expect(body.cases[0]!.code).toBe("T-100");
  });
});
