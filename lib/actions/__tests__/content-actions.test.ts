import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const contentItem = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const mockPrisma = { contentItem };
  return { contentItem, mockPrisma, requireWriter: vi.fn() };
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

import { createContent, updateContent, moveContent, deleteContent } from "../content-actions";

const OK_USER = {
  ok: true as const,
  user: { userId: "u1", personId: "p1", email: "m@x", role: "membro" as const, name: "Membro", projectIds: [] },
};
const FAIL_AUTH = { ok: false as const, error: "Sem permissão" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWriter.mockResolvedValue(OK_USER);
});

// ─── createContent ──────────────────────────────────────────

describe("createContent", () => {
  it("bloqueia sem auth", async () => {
    mocks.requireWriter.mockResolvedValueOnce(FAIL_AUTH);
    const fd = new FormData();
    fd.set("title", "Vídeo");
    const r = await createContent(undefined, fd);
    expect(r).toEqual({ error: "Sem permissão" });
  });

  it("rejeita título vazio", async () => {
    const fd = new FormData();
    fd.set("title", "");
    const r = await createContent(undefined, fd);
    expect(r).toHaveProperty("error");
  });

  it("cria com status proposta por defeito", async () => {
    mocks.contentItem.create.mockResolvedValue({ id: "c1" });
    const fd = new FormData();
    fd.set("title", "Novo vídeo");
    const r = await createContent(undefined, fd);
    expect(r).toEqual({ success: true, data: { id: "c1" } });
    expect(mocks.contentItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "proposta" }),
      })
    );
  });
});

// ─── updateContent ──────────────────────────────────────────

describe("updateContent", () => {
  it("rejeita sem id", async () => {
    const fd = new FormData();
    fd.set("title", "Updated");
    const r = await updateContent(undefined, fd);
    expect(r).toHaveProperty("error");
  });

  it("actualiza com sucesso", async () => {
    mocks.contentItem.findUnique.mockResolvedValue({ id: "c1" });
    mocks.contentItem.update.mockResolvedValue({});
    const fd = new FormData();
    fd.set("id", "c1");
    fd.set("title", "Título updated");
    const r = await updateContent(undefined, fd);
    expect(r).toEqual({ success: true, data: { id: "c1" } });
  });
});

// ─── moveContent ────────────────────────────────────────────

describe("moveContent", () => {
  it("move entre statuses", async () => {
    mocks.contentItem.findUnique.mockResolvedValue({ id: "c1", status: "proposta" });
    mocks.contentItem.update.mockResolvedValue({});
    const r = await moveContent("c1", { toStatus: "aprovado" });
    expect(r).toEqual({ success: true });
    expect(mocks.contentItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "aprovado",
          approvedAt: expect.any(Date),
          approvedById: "p1",
        }),
      })
    );
  });

  it("set publishedAt ao mover para publicado", async () => {
    mocks.contentItem.findUnique.mockResolvedValue({ id: "c1", status: "pronto" });
    mocks.contentItem.update.mockResolvedValue({});
    const r = await moveContent("c1", { toStatus: "publicado" });
    expect(r).toEqual({ success: true });
    expect(mocks.contentItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "publicado",
          publishedAt: expect.any(Date),
        }),
      })
    );
  });

  it("rejeita status inválido", async () => {
    const r = await moveContent("c1", { toStatus: "done" as never });
    expect(r).toHaveProperty("error");
  });

  it("retorna erro se não existe", async () => {
    mocks.contentItem.findUnique.mockResolvedValue(null);
    const r = await moveContent("missing", { toStatus: "aprovado" });
    expect(r).toEqual({ error: "Conteúdo não encontrado" });
  });
});

// ─── deleteContent ──────────────────────────────────────────

describe("deleteContent", () => {
  it("elimina com sucesso", async () => {
    mocks.contentItem.findUnique.mockResolvedValue({ id: "c1" });
    mocks.contentItem.delete.mockResolvedValue({});
    const r = await deleteContent("c1");
    expect(r).toEqual({ success: true });
  });

  it("retorna erro se não existe", async () => {
    mocks.contentItem.findUnique.mockResolvedValue(null);
    const r = await deleteContent("missing");
    expect(r).toEqual({ error: "Conteúdo não encontrado" });
  });

  it("bloqueia sem auth", async () => {
    mocks.requireWriter.mockResolvedValueOnce(FAIL_AUTH);
    const r = await deleteContent("c1");
    expect(r).toEqual({ error: "Sem permissão" });
  });
});
