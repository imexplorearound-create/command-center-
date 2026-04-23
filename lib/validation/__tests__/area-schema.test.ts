import { describe, it, expect } from "vitest";
import { areaCreateSchema, areaUpdateSchema, slugify } from "../area-schema";

describe("areaCreateSchema", () => {
  it("aceita input mínimo válido", () => {
    const r = areaCreateSchema.safeParse({ name: "Recursos Humanos" });
    expect(r.success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    const r = areaCreateSchema.safeParse({ name: "" });
    expect(r.success).toBe(false);
  });

  it("rejeita slug com maiúsculas", () => {
    const r = areaCreateSchema.safeParse({ name: "X", slug: "RH-Geral" });
    expect(r.success).toBe(false);
  });

  it("aceita slug válido", () => {
    const r = areaCreateSchema.safeParse({ name: "X", slug: "rh-geral" });
    expect(r.success).toBe(true);
  });

  it("aceita slug vazio (será auto-gerado)", () => {
    const r = areaCreateSchema.safeParse({ name: "RH", slug: "" });
    expect(r.success).toBe(true);
  });

  it("rejeita cor não-hex", () => {
    const r = areaCreateSchema.safeParse({ name: "X", color: "blue" });
    expect(r.success).toBe(false);
  });

  it("rejeita ownerId que não é UUID", () => {
    const r = areaCreateSchema.safeParse({ name: "X", ownerId: "abc" });
    expect(r.success).toBe(false);
  });
});

describe("areaUpdateSchema", () => {
  it("aceita patch parcial", () => {
    const r = areaUpdateSchema.safeParse({ name: "Novo" });
    expect(r.success).toBe(true);
  });
});

describe("slugify (re-export)", () => {
  it("converte nome com acentos", () => {
    expect(slugify("Recursos Humanos")).toBe("recursos-humanos");
    expect(slugify("Operações")).toBe("operacoes");
  });
});
