import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const interaction = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const client = { update: vi.fn() };
  const project = { findUnique: vi.fn() };
  const $transaction = vi.fn();
  const mockPrisma = { interaction, client, project, $transaction };
  return { interaction, client, project, $transaction, mockPrisma, requireWriter: vi.fn() };
});

vi.mock("@/lib/db", () => ({
  prisma: mocks.mockPrisma,
  basePrisma: mocks.mockPrisma,
}));

vi.mock("@/lib/tenant", () => ({
  getTenantDb: vi.fn().mockResolvedValue(mocks.mockPrisma),
  getTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
}));

vi.mock("@/lib/auth/dal", () => ({
  requireWriter: mocks.requireWriter,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createInteraction, updateInteraction, deleteInteraction } from "../interaction-actions";

const OK_USER = {
  ok: true as const,
  user: { userId: "u1", personId: "p1", email: "m@x", role: "membro" as const, name: "Membro", projectIds: [] },
};
const FAIL_AUTH = { ok: false as const, error: "Sem permissão" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWriter.mockResolvedValue(OK_USER);
  mocks.project.findUnique.mockResolvedValue({ slug: "test" });
  mocks.$transaction.mockImplementation(async (args: unknown) => {
    if (Array.isArray(args)) return Promise.all(args);
    return args;
  });
});

// ─── createInteraction ──────────────────────────────────────

describe("createInteraction", () => {
  it("bloqueia sem auth", async () => {
    mocks.requireWriter.mockResolvedValueOnce(FAIL_AUTH);
    const fd = new FormData();
    fd.set("title", "Call");
    const r = await createInteraction(undefined, fd);
    expect(r).toEqual({ error: "Sem permissão" });
  });

  it("rejeita título vazio", async () => {
    const fd = new FormData();
    fd.set("title", "");
    fd.set("type", "call");
    fd.set("interactionDate", "2026-04-01T15:00:00Z");
    fd.set("clientId", "550e8400-e29b-41d4-a716-446655440000");
    const r = await createInteraction(undefined, fd);
    expect(r).toHaveProperty("error");
  });

  it("cria interação com sucesso", async () => {
    mocks.interaction.create.mockResolvedValue({ id: "new-id" });
    mocks.client.update.mockResolvedValue({});

    const fd = new FormData();
    fd.set("title", "Call kickoff");
    fd.set("type", "call");
    fd.set("interactionDate", "2026-04-01T15:00:00Z");
    fd.set("clientId", "550e8400-e29b-41d4-a716-446655440000");
    fd.set("projectId", "");

    const r = await createInteraction(undefined, fd);
    expect(r).toEqual({ success: true, data: { id: "new-id" } });
    expect(mocks.interaction.create).toHaveBeenCalledOnce();
    expect(mocks.client.update).toHaveBeenCalledOnce();
  });
});

// ─── updateInteraction ──────────────────────────────────────

describe("updateInteraction", () => {
  it("rejeita sem id", async () => {
    const fd = new FormData();
    fd.set("title", "Updated");
    const r = await updateInteraction(undefined, fd);
    expect(r).toHaveProperty("error");
  });

  it("actualiza interação com sucesso", async () => {
    mocks.interaction.findUnique.mockResolvedValue({ id: "i1", projectId: "p1" });
    mocks.interaction.update.mockResolvedValue({});

    const fd = new FormData();
    fd.set("id", "i1");
    fd.set("title", "Updated title");
    const r = await updateInteraction(undefined, fd);
    expect(r).toEqual({ success: true, data: { id: "i1" } });
  });

  it("retorna erro se não existe", async () => {
    mocks.interaction.findUnique.mockResolvedValue(null);
    const fd = new FormData();
    fd.set("id", "missing");
    const r = await updateInteraction(undefined, fd);
    expect(r).toEqual({ error: "Interação não encontrada" });
  });
});

// ─── deleteInteraction ──────────────────────────────────────

describe("deleteInteraction", () => {
  it("elimina com sucesso", async () => {
    mocks.interaction.findUnique.mockResolvedValue({ id: "i1", projectId: "p1" });
    mocks.interaction.delete.mockResolvedValue({});
    const r = await deleteInteraction("i1");
    expect(r).toEqual({ success: true });
    expect(mocks.interaction.delete).toHaveBeenCalledWith({ where: { id: "i1" } });
  });

  it("retorna erro se não existe", async () => {
    mocks.interaction.findUnique.mockResolvedValue(null);
    const r = await deleteInteraction("missing");
    expect(r).toEqual({ error: "Interação não encontrada" });
  });

  it("bloqueia sem auth", async () => {
    mocks.requireWriter.mockResolvedValueOnce(FAIL_AUTH);
    const r = await deleteInteraction("i1");
    expect(r).toEqual({ error: "Sem permissão" });
  });
});
