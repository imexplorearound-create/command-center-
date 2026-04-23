import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const decision = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  };
  const opportunity = { findMany: vi.fn() };
  const feedbackItem = { findMany: vi.fn() };
  const project = { findMany: vi.fn() };
  const crewRole = { findMany: vi.fn() };
  const mockPrisma = { decision, opportunity, feedbackItem, project, crewRole };
  return { decision, opportunity, feedbackItem, project, crewRole, mockPrisma, requireWriter: vi.fn(), getAuthUser: vi.fn() };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.mockPrisma, basePrisma: mocks.mockPrisma }));
vi.mock("@/lib/tenant", () => ({
  getTenantDb: vi.fn().mockResolvedValue(mocks.mockPrisma),
  getTenantId: vi.fn().mockResolvedValue("test-tenant"),
}));
vi.mock("@/lib/auth/dal", () => ({
  requireWriter: mocks.requireWriter,
  getAuthUser: mocks.getAuthUser,
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  resolveDecision,
  snoozeDecision,
  reopenDecision,
  recomputeDecisions,
} from "../decision-actions";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWriter.mockResolvedValue({ ok: true, user: { personId: "person-1", role: "admin" } });
  mocks.getAuthUser.mockResolvedValue({ personId: "person-1", role: "admin" });
});

describe("resolveDecision", () => {
  it("devolve erro se caller não for writer", async () => {
    mocks.requireWriter.mockResolvedValueOnce({ ok: false, error: "Sem permissão" });
    const fd = new FormData();
    fd.set("decisionId", VALID_UUID);
    const r = await resolveDecision(undefined, fd);
    expect(r).toEqual({ error: "Sem permissão" });
  });

  it("marca resolvedAt + resolvedById + nota", async () => {
    mocks.decision.update.mockResolvedValue({});
    const fd = new FormData();
    fd.set("decisionId", VALID_UUID);
    fd.set("resolutionNote", "Resolvido em call");
    const r = await resolveDecision(undefined, fd);
    expect(r).toEqual({ success: true });
    const call = mocks.decision.update.mock.calls[0]![0];
    expect(call.where).toEqual({ id: VALID_UUID });
    expect(call.data.resolvedAt).toBeInstanceOf(Date);
    expect(call.data.resolvedById).toBe("person-1");
    expect(call.data.resolutionNote).toBe("Resolvido em call");
  });

  it("rejeita decisionId inválido", async () => {
    const fd = new FormData();
    fd.set("decisionId", "not-a-uuid");
    const r = await resolveDecision(undefined, fd);
    expect(r).toHaveProperty("error");
  });
});

describe("snoozeDecision", () => {
  it("aceita ISO string", async () => {
    mocks.decision.update.mockResolvedValue({});
    const fd = new FormData();
    fd.set("decisionId", VALID_UUID);
    fd.set("snoozedUntil", "2026-05-01T09:00:00+01:00");
    const r = await snoozeDecision(undefined, fd);
    expect(r).toEqual({ success: true });
    expect(mocks.decision.update.mock.calls[0]![0].data.snoozedUntil).toBeInstanceOf(Date);
  });

  it("rejeita data mal-formada", async () => {
    const fd = new FormData();
    fd.set("decisionId", VALID_UUID);
    fd.set("snoozedUntil", "tomorrow");
    const r = await snoozeDecision(undefined, fd);
    expect(r).toHaveProperty("error");
  });
});

describe("reopenDecision", () => {
  it("limpa resolvedAt + resolvedById + resolutionNote", async () => {
    mocks.decision.update.mockResolvedValue({});
    const fd = new FormData();
    fd.set("decisionId", VALID_UUID);
    const r = await reopenDecision(undefined, fd);
    expect(r).toEqual({ success: true });
    expect(mocks.decision.update.mock.calls[0]![0].data).toEqual({
      resolvedAt: null,
      resolvedById: null,
      resolutionNote: null,
    });
  });
});

describe("recomputeDecisions", () => {
  it("cria nova decisão quando sinal aparece e não havia decisão", async () => {
    mocks.opportunity.findMany.mockResolvedValue([
      { id: "opp-1", title: "Deal A", crewRoleId: null },
    ]);
    mocks.feedbackItem.findMany.mockResolvedValue([]);
    mocks.project.findMany.mockResolvedValue([]);
    mocks.crewRole.findMany.mockResolvedValue([
      { id: "role-pipeline", slug: "pipeline" },
    ]);
    mocks.decision.findMany.mockResolvedValue([]);
    mocks.decision.createMany.mockResolvedValue({ count: 1 });

    const r = await recomputeDecisions();
    expect(r).toEqual({ success: true, data: { generated: 1, resolved: 0 } });
    expect(mocks.decision.createMany).toHaveBeenCalledOnce();
    const call = mocks.decision.createMany.mock.calls[0]![0];
    expect(call.data).toHaveLength(1);
    expect(call.data[0].kind).toBe("pipeline_stall");
  });

  it("auto-resolve decisão quando sinal desaparece", async () => {
    mocks.opportunity.findMany.mockResolvedValue([]);
    mocks.feedbackItem.findMany.mockResolvedValue([]);
    mocks.project.findMany.mockResolvedValue([]);
    mocks.crewRole.findMany.mockResolvedValue([]);
    mocks.decision.findMany.mockResolvedValue([
      {
        id: "dec-stale",
        kind: "pipeline_stall",
        opportunityId: "opp-gone",
        feedbackItemId: null,
        projectId: null,
      },
    ]);
    mocks.decision.updateMany.mockResolvedValue({ count: 1 });

    const r = await recomputeDecisions();
    expect(r).toEqual({ success: true, data: { generated: 0, resolved: 1 } });
    expect(mocks.decision.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["dec-stale"] } },
      data: {
        resolvedAt: expect.any(Date),
        resolutionNote: "Auto-resolvido: condição já não se verifica.",
      },
    });
  });

  it("não duplica decisão quando sinal persiste", async () => {
    mocks.opportunity.findMany.mockResolvedValue([
      { id: "opp-1", title: "Deal A", crewRoleId: null },
    ]);
    mocks.feedbackItem.findMany.mockResolvedValue([]);
    mocks.project.findMany.mockResolvedValue([]);
    mocks.crewRole.findMany.mockResolvedValue([]);
    mocks.decision.findMany.mockResolvedValue([
      { id: "dec-1", kind: "pipeline_stall", opportunityId: "opp-1", feedbackItemId: null, projectId: null },
    ]);

    const r = await recomputeDecisions();
    expect(r).toEqual({ success: true, data: { generated: 0, resolved: 0 } });
    expect(mocks.decision.createMany).not.toHaveBeenCalled();
    expect(mocks.decision.updateMany).not.toHaveBeenCalled();
  });
});
