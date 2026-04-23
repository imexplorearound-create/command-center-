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
  createDecision,
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

describe("createDecision", () => {
  it("devolve erro se caller não for writer", async () => {
    mocks.requireWriter.mockResolvedValueOnce({ ok: false, error: "Sem permissão" });
    const fd = new FormData();
    fd.set("title", "Decidir orçamento Q2");
    fd.set("kind", "other");
    fd.set("severity", "warn");
    const r = await createDecision(undefined, fd);
    expect(r).toEqual({ error: "Sem permissão" });
    expect(mocks.decision.create).not.toHaveBeenCalled();
  });

  it("cria decisão válida e devolve id", async () => {
    mocks.decision.create.mockResolvedValue({ id: VALID_UUID });
    const fd = new FormData();
    fd.set("title", "Decidir orçamento Q2");
    fd.set("context", "Cliente pediu proposta até sexta");
    fd.set("kind", "budget");
    fd.set("severity", "warn");
    fd.set("dueAt", "2026-05-01T12:00:00Z");

    const r = await createDecision(undefined, fd);

    expect(r).toEqual({ success: true, data: { id: VALID_UUID } });
    const call = mocks.decision.create.mock.calls[0]![0];
    expect(call.data.title).toBe("Decidir orçamento Q2");
    expect(call.data.context).toBe("Cliente pediu proposta até sexta");
    expect(call.data.kind).toBe("budget");
    expect(call.data.severity).toBe("warn");
    expect(call.data.dueAt).toBeInstanceOf(Date);
    expect(call.data.dueAt?.toISOString()).toBe("2026-05-01T12:00:00.000Z");
  });

  it("converte campos opcionais vazios em null (emptyToNull)", async () => {
    mocks.decision.create.mockResolvedValue({ id: VALID_UUID });
    const fd = new FormData();
    fd.set("title", "Escolher nome da release");
    fd.set("kind", "other");
    fd.set("severity", "pend");
    // context, crewRoleId, dueAt etc. omitidos — FormData.get devolve string vazia
    fd.set("context", "");
    fd.set("crewRoleId", "");
    fd.set("dueAt", "");
    fd.set("projectId", "");

    const r = await createDecision(undefined, fd);

    expect(r).toEqual({ success: true, data: { id: VALID_UUID } });
    const call = mocks.decision.create.mock.calls[0]![0];
    expect(call.data.context).toBeNull();
    expect(call.data.crewRoleId).toBeNull();
    expect(call.data.dueAt).toBeNull();
    expect(call.data.projectId).toBeNull();
  });

  it("rejeita input com kind inválido", async () => {
    const fd = new FormData();
    fd.set("title", "Algo");
    fd.set("kind", "kind_que_nao_existe");
    fd.set("severity", "warn");
    const r = await createDecision(undefined, fd);
    expect(r).toHaveProperty("error");
    expect(mocks.decision.create).not.toHaveBeenCalled();
  });

  it("rejeita título vazio", async () => {
    const fd = new FormData();
    fd.set("title", "");
    fd.set("kind", "other");
    fd.set("severity", "warn");
    const r = await createDecision(undefined, fd);
    expect(r).toHaveProperty("error");
    expect(mocks.decision.create).not.toHaveBeenCalled();
  });
});

describe("resolveDecision", () => {
  it("devolve erro se caller não for writer", async () => {
    mocks.requireWriter.mockResolvedValueOnce({ ok: false, error: "Sem permissão" });
    const fd = new FormData();
    fd.set("decisionId", VALID_UUID);
    const r = await resolveDecision(undefined, fd);
    expect(r).toEqual({ error: "Sem permissão" });
  });

  it("marca resolvedAt + resolvedById + nota + resolutionSource='human'", async () => {
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
    expect(call.data.resolutionSource).toBe("human");
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

describe("reopenDecision (DB1: cria nova row + liga via reopenedById)", () => {
  const NEW_UUID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
  const OLD_SHAPE = {
    id: VALID_UUID,
    title: "Decidir preço final",
    context: "Cliente pediu desconto",
    kind: "budget",
    severity: "warn",
    crewRoleId: "role-1",
    dueAt: null,
    projectId: "proj-1",
    opportunityId: null,
    taskId: null,
    sourceMaestroActionId: null,
    feedbackItemId: null,
    reopenedById: null,
  };

  it("cria nova Decision com campos copiados e guarda reopenedById na antiga", async () => {
    mocks.decision.findUnique.mockResolvedValue(OLD_SHAPE);
    mocks.decision.create.mockResolvedValue({ id: NEW_UUID });
    mocks.decision.update.mockResolvedValue({});

    const fd = new FormData();
    fd.set("decisionId", VALID_UUID);
    const r = await reopenDecision(undefined, fd);

    expect(r).toEqual({ success: true, data: { id: NEW_UUID } });

    // Copia campos da antiga para a nova
    const createCall = mocks.decision.create.mock.calls[0]![0];
    expect(createCall.data.title).toBe(OLD_SHAPE.title);
    expect(createCall.data.kind).toBe(OLD_SHAPE.kind);
    expect(createCall.data.severity).toBe(OLD_SHAPE.severity);
    expect(createCall.data.crewRoleId).toBe(OLD_SHAPE.crewRoleId);
    expect(createCall.data.projectId).toBe(OLD_SHAPE.projectId);
    // Nova não herda `resolvedAt`/`resolvedById` — começa como aberta.
    expect(createCall.data.resolvedAt).toBeUndefined();
    expect(createCall.data.resolvedById).toBeUndefined();

    // A antiga mantém `resolvedAt`/`resolvedById` intactos — só adquire `reopenedById`.
    const updateCall = mocks.decision.update.mock.calls[0]![0];
    expect(updateCall.where).toEqual({ id: VALID_UUID });
    expect(updateCall.data).toEqual({ reopenedById: NEW_UUID });
  });

  it("rejeita se a decisão não existir", async () => {
    mocks.decision.findUnique.mockResolvedValue(null);
    const fd = new FormData();
    fd.set("decisionId", VALID_UUID);
    const r = await reopenDecision(undefined, fd);
    expect(r).toEqual({ error: "Decisão não encontrada" });
    expect(mocks.decision.create).not.toHaveBeenCalled();
  });

  it("rejeita se a decisão já foi reaberta (evita cadeia duplicada)", async () => {
    mocks.decision.findUnique.mockResolvedValue({
      ...OLD_SHAPE,
      reopenedById: "existing-successor-id",
    });
    const fd = new FormData();
    fd.set("decisionId", VALID_UUID);
    const r = await reopenDecision(undefined, fd);
    expect(r).toEqual({ error: "Esta decisão já foi reaberta" });
    expect(mocks.decision.create).not.toHaveBeenCalled();
  });

  it("devolve erro se caller não for writer", async () => {
    mocks.requireWriter.mockResolvedValueOnce({ ok: false, error: "Sem permissão" });
    const fd = new FormData();
    fd.set("decisionId", VALID_UUID);
    const r = await reopenDecision(undefined, fd);
    expect(r).toEqual({ error: "Sem permissão" });
    expect(mocks.decision.findUnique).not.toHaveBeenCalled();
  });

  it("rejeita decisionId inválido", async () => {
    const fd = new FormData();
    fd.set("decisionId", "not-a-uuid");
    const r = await reopenDecision(undefined, fd);
    expect(r).toHaveProperty("error");
    expect(mocks.decision.findUnique).not.toHaveBeenCalled();
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
        resolutionSource: "auto",
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
