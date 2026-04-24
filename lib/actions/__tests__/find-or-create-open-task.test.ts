import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const task = {
    findFirst: vi.fn(),
  };
  const mockPrisma = { task, $queryRaw: vi.fn() };
  return { task, mockPrisma };
});

vi.mock("server-only", () => ({}));

import { findOrCreateOpenTaskForTestCase } from "../find-or-create-open-task";

import {
  TEST_TENANT_UUID as TENANT,
  TEST_PROJECT_UUID as PROJECT,
  TEST_TEST_CASE_UUID as TEST_CASE,
} from "@/lib/__tests__/test-uuids";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findOrCreateOpenTaskForTestCase", () => {
  it("cria nova task quando não há conflict (RETURNING preenche id)", async () => {
    mocks.mockPrisma.$queryRaw.mockResolvedValue([{ id: "new-task-1" }]);

    const r = await findOrCreateOpenTaskForTestCase(
      mocks.mockPrisma as never,
      {
        tenantId: TENANT,
        testCaseId: TEST_CASE,
        projectId: PROJECT,
        title: "Fix login button",
      },
    );

    expect(r).toEqual({ id: "new-task-1", created: true });
    expect(mocks.mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mocks.task.findFirst).not.toHaveBeenCalled();
  });

  it("quando há conflict (RETURNING vazio), devolve a task aberta existente", async () => {
    mocks.task.findFirst.mockResolvedValue({ id: "existing-task-1" });
    mocks.mockPrisma.$queryRaw.mockResolvedValue([]);

    const r = await findOrCreateOpenTaskForTestCase(
      mocks.mockPrisma as never,
      {
        tenantId: TENANT,
        testCaseId: TEST_CASE,
        projectId: PROJECT,
        title: "Fix login button",
      },
    );

    expect(r).toEqual({ id: "existing-task-1", created: false });
    expect(mocks.task.findFirst).toHaveBeenCalledTimes(1);
  });

  it("lança se conflict mas a task aberta já não existe (race exótica)", async () => {
    mocks.task.findFirst.mockResolvedValue(null);
    mocks.mockPrisma.$queryRaw.mockResolvedValue([]);

    await expect(
      findOrCreateOpenTaskForTestCase(mocks.mockPrisma as never, {
        tenantId: TENANT,
        testCaseId: TEST_CASE,
        projectId: PROJECT,
        title: "x",
      }),
    ).rejects.toThrow(/retry/);
  });
});
