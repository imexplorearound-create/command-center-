import { describe, it, expect } from "vitest";
import {
  contentCreateSchema,
  contentUpdateSchema,
  contentMoveSchema,
} from "../content-schema";

describe("contentCreateSchema", () => {
  it("aceita input mínimo válido", () => {
    const r = contentCreateSchema.safeParse({ title: "Novo vídeo" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe("proposta"); // default
    }
  });

  it("rejeita título vazio", () => {
    const r = contentCreateSchema.safeParse({ title: "" });
    expect(r.success).toBe(false);
  });

  it("rejeita status inválido", () => {
    const r = contentCreateSchema.safeParse({ title: "X", status: "rascunho" });
    expect(r.success).toBe(false);
  });

  it("rejeita formato inválido", () => {
    const r = contentCreateSchema.safeParse({ title: "X", format: "tiktok_story" });
    expect(r.success).toBe(false);
  });

  it("aceita todos os formatos válidos", () => {
    for (const format of ["video", "artigo", "podcast", "post", "reels", "carrossel"]) {
      const r = contentCreateSchema.safeParse({ title: "X", format });
      expect(r.success).toBe(true);
    }
  });

  it("aceita campos opcionais vazios (FormData)", () => {
    const r = contentCreateSchema.safeParse({
      title: "X",
      platform: "",
      sourceCallDate: "",
      projectId: "",
    });
    expect(r.success).toBe(true);
  });

  it("aceita sourceCallDate válida", () => {
    const r = contentCreateSchema.safeParse({ title: "X", sourceCallDate: "2026-04-01" });
    expect(r.success).toBe(true);
  });

  it("rejeita sourceCallDate malformada", () => {
    const r = contentCreateSchema.safeParse({ title: "X", sourceCallDate: "ontem" });
    expect(r.success).toBe(false);
  });
});

describe("contentUpdateSchema", () => {
  it("aceita patch parcial", () => {
    const r = contentUpdateSchema.safeParse({ status: "aprovado" });
    expect(r.success).toBe(true);
  });

  it("aceita objecto vazio", () => {
    const r = contentUpdateSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("rejeita título vazio explícito", () => {
    const r = contentUpdateSchema.safeParse({ title: "" });
    expect(r.success).toBe(false);
  });
});

describe("contentMoveSchema", () => {
  it("aceita move válido", () => {
    const r = contentMoveSchema.safeParse({ toStatus: "aprovado" });
    expect(r.success).toBe(true);
  });

  it("rejeita status inválido", () => {
    const r = contentMoveSchema.safeParse({ toStatus: "done" });
    expect(r.success).toBe(false);
  });

  it("aceita todos os statuses válidos", () => {
    for (const s of ["proposta", "aprovado", "em_producao", "pronto", "publicado"]) {
      const r = contentMoveSchema.safeParse({ toStatus: s });
      expect(r.success).toBe(true);
    }
  });
});
