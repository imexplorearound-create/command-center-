import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const task = { findFirst: vi.fn() };
  const feedbackItem = {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  };
  return { task, feedbackItem, mockPrisma: { task, feedbackItem } };
});

vi.mock("server-only", () => ({}));

import { applyDevTransition } from "../task-dev-transitions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.task.findFirst.mockResolvedValue({ id: "t1" });
});

describe("applyDevTransition — transições válidas", () => {
  it("approved → in_dev", async () => {
    mocks.feedbackItem.findMany.mockResolvedValue([
      { id: "f1", approvalStatus: "approved" },
      { id: "f2", approvalStatus: "approved" },
    ]);
    mocks.feedbackItem.updateMany.mockResolvedValue({ count: 2 });

    const r = await applyDevTransition(mocks.mockPrisma as never, "t1", "in_dev");

    expect(r).toEqual({ ok: true, newStatus: "in_dev", affected: 2 });
    const call = mocks.feedbackItem.updateMany.mock.calls[0]![0];
    expect(call.where).toMatchObject({ taskId: "t1", approvalStatus: "approved" });
    expect(call.data.approvalStatus).toBe("in_dev");
  });

  it("in_dev → ready_for_verification", async () => {
    mocks.feedbackItem.findMany.mockResolvedValue([
      { id: "f1", approvalStatus: "in_dev" },
    ]);
    mocks.feedbackItem.updateMany.mockResolvedValue({ count: 1 });

    const r = await applyDevTransition(
      mocks.mockPrisma as never,
      "t1",
      "ready_for_verification",
    );
    expect(r).toEqual({
      ok: true,
      newStatus: "ready_for_verification",
      affected: 1,
    });
  });
});

describe("applyDevTransition — rejeições", () => {
  it("in_dev → needs_review com rejection reason (origem=dev)", async () => {
    mocks.feedbackItem.findMany.mockResolvedValue([
      { id: "f1", approvalStatus: "in_dev" },
    ]);
    mocks.feedbackItem.updateMany.mockResolvedValue({ count: 1 });

    const r = await applyDevTransition(mocks.mockPrisma as never, "t1", "needs_review", {
      rejectionReason: "Spec incompleta",
      rejectionOrigin: "dev",
    });
    expect(r.ok).toBe(true);
    const call = mocks.feedbackItem.updateMany.mock.calls[0]![0];
    expect(call.data.approvalStatus).toBe("needs_review");
    expect(call.data.rejectionReason).toBe("Spec incompleta");
    expect(call.data.rejectionOrigin).toBe("dev");
  });

  it("rejeita reject sem rejectionReason", async () => {
    mocks.feedbackItem.findMany.mockResolvedValue([
      { id: "f1", approvalStatus: "in_dev" },
    ]);
    const r = await applyDevTransition(mocks.mockPrisma as never, "t1", "needs_review");
    expect(r).toEqual({
      ok: false,
      status: 400,
      error: "rejectionReason required on reject",
    });
    expect(mocks.feedbackItem.updateMany).not.toHaveBeenCalled();
  });

  it("rejeita needs_review a partir de approved (só permite a partir de in_dev ou ready_for_verification)", async () => {
    mocks.feedbackItem.findMany.mockResolvedValue([
      { id: "f1", approvalStatus: "approved" },
    ]);
    const r = await applyDevTransition(mocks.mockPrisma as never, "t1", "needs_review", {
      rejectionReason: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.status).toBe(409);
  });
});

describe("applyDevTransition — transições inválidas", () => {
  it("404 se task não existe ou está arquivada", async () => {
    mocks.task.findFirst.mockResolvedValueOnce(null);
    const r = await applyDevTransition(mocks.mockPrisma as never, "t1", "in_dev");
    expect(r).toMatchObject({ ok: false, status: 404, error: expect.stringContaining("archived") });
  });

  it("404 se task não tem feedback items activos", async () => {
    mocks.feedbackItem.findMany.mockResolvedValue([]);
    const r = await applyDevTransition(mocks.mockPrisma as never, "t1", "in_dev");
    expect(r).toMatchObject({ ok: false, status: 404 });
  });

  it("409 se updateMany afecta menos linhas que items encontrados (race concorrente)", async () => {
    mocks.feedbackItem.findMany.mockResolvedValue([
      { id: "f1", approvalStatus: "approved" },
      { id: "f2", approvalStatus: "approved" },
    ]);
    mocks.feedbackItem.updateMany.mockResolvedValue({ count: 1 });
    const r = await applyDevTransition(mocks.mockPrisma as never, "t1", "in_dev");
    expect(r).toMatchObject({
      ok: false,
      status: 409,
      error: expect.stringContaining("Concurrent"),
    });
  });

  it("409 se feedbacks estão em estados mistos", async () => {
    mocks.feedbackItem.findMany.mockResolvedValue([
      { id: "f1", approvalStatus: "approved" },
      { id: "f2", approvalStatus: "in_dev" },
    ]);
    const r = await applyDevTransition(mocks.mockPrisma as never, "t1", "in_dev");
    expect(r).toMatchObject({
      ok: false,
      status: 409,
      error: expect.stringContaining("mixed states"),
    });
  });

  it("409 em salto de estado inválido (approved → ready_for_verification)", async () => {
    mocks.feedbackItem.findMany.mockResolvedValue([
      { id: "f1", approvalStatus: "approved" },
    ]);
    const r = await applyDevTransition(
      mocks.mockPrisma as never,
      "t1",
      "ready_for_verification",
    );
    expect(r).toMatchObject({ ok: false, status: 409 });
  });
});
