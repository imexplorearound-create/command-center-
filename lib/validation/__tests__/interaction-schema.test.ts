import { describe, it, expect } from "vitest";
import {
  interactionCreateSchema,
  interactionUpdateSchema,
} from "../interaction-schema";

describe("interactionCreateSchema", () => {
  it("aceita input válido completo", () => {
    const r = interactionCreateSchema.safeParse({
      title: "Call de kickoff",
      type: "call",
      interactionDate: "2026-04-01T15:00:00Z",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.participants).toEqual([]);
    }
  });

  it("rejeita título vazio", () => {
    const r = interactionCreateSchema.safeParse({
      title: "",
      type: "call",
      interactionDate: "2026-04-01T15:00:00Z",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita tipo inválido", () => {
    const r = interactionCreateSchema.safeParse({
      title: "X",
      type: "sms",
      interactionDate: "2026-04-01T15:00:00Z",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita data inválida", () => {
    const r = interactionCreateSchema.safeParse({
      title: "X",
      type: "call",
      interactionDate: "ontem",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita clientId inválido", () => {
    const r = interactionCreateSchema.safeParse({
      title: "X",
      type: "call",
      interactionDate: "2026-04-01T15:00:00Z",
      clientId: "not-a-uuid",
    });
    expect(r.success).toBe(false);
  });

  it("aceita campos opcionais vazios (FormData)", () => {
    const r = interactionCreateSchema.safeParse({
      title: "X",
      type: "nota",
      interactionDate: "2026-04-01T15:00:00Z",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      body: "",
      source: "",
      sourceRef: "",
      projectId: "",
    });
    expect(r.success).toBe(true);
  });

  it("aceita todos os tipos válidos", () => {
    for (const type of ["call", "email", "decisao", "documento", "tarefa", "nota"]) {
      const r = interactionCreateSchema.safeParse({
        title: "X",
        type,
        interactionDate: "2026-04-01T15:00:00Z",
        clientId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(r.success).toBe(true);
    }
  });
});

describe("interactionUpdateSchema", () => {
  it("aceita patch parcial", () => {
    const r = interactionUpdateSchema.safeParse({ title: "Novo título" });
    expect(r.success).toBe(true);
  });

  it("aceita objecto vazio", () => {
    const r = interactionUpdateSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("rejeita título vazio explícito", () => {
    const r = interactionUpdateSchema.safeParse({ title: "" });
    expect(r.success).toBe(false);
  });
});
