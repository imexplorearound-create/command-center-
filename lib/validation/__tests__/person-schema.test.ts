import { describe, it, expect } from "vitest";
import { personCreateSchema, personUpdateSchema } from "../person-schema";

describe("personCreateSchema", () => {
  it("aceita input mínimo válido", () => {
    const r = personCreateSchema.safeParse({ name: "Ana", type: "equipa" });
    expect(r.success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    const r = personCreateSchema.safeParse({ name: "", type: "equipa" });
    expect(r.success).toBe(false);
  });

  it("rejeita type inválido", () => {
    const r = personCreateSchema.safeParse({ name: "X", type: "fornecedor" });
    expect(r.success).toBe(false);
  });

  it("rejeita email malformado", () => {
    const r = personCreateSchema.safeParse({ name: "X", type: "equipa", email: "nao-e-email" });
    expect(r.success).toBe(false);
  });

  it("aceita email vazio (FormData)", () => {
    const r = personCreateSchema.safeParse({ name: "X", type: "equipa", email: "" });
    expect(r.success).toBe(true);
  });

  it("rejeita cor não-hex", () => {
    const r = personCreateSchema.safeParse({ name: "X", type: "equipa", avatarColor: "vermelho" });
    expect(r.success).toBe(false);
  });

  it("aceita cor hex válida", () => {
    const r = personCreateSchema.safeParse({ name: "X", type: "equipa", avatarColor: "#378ADD" });
    expect(r.success).toBe(true);
  });
});

describe("personUpdateSchema", () => {
  it("aceita patch parcial vazio", () => {
    const r = personUpdateSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("aceita só nome", () => {
    const r = personUpdateSchema.safeParse({ name: "Novo nome" });
    expect(r.success).toBe(true);
  });
});
