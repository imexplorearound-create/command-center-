import { describe, it, expect } from "vitest";
import {
  taskCreateSchema,
  taskUpdateSchema,
  taskMoveSchema,
} from "../task-schema";

describe("taskCreateSchema", () => {
  it("aceita input mínimo válido", () => {
    const r = taskCreateSchema.safeParse({ title: "Tarefa nova" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe("backlog"); // default
      expect(r.data.priority).toBe("media"); // default
    }
  });

  it("rejeita título vazio", () => {
    const r = taskCreateSchema.safeParse({ title: "" });
    expect(r.success).toBe(false);
  });

  it("rejeita status inválido", () => {
    const r = taskCreateSchema.safeParse({ title: "X", status: "abc" });
    expect(r.success).toBe(false);
  });

  it("rejeita priority inválida", () => {
    const r = taskCreateSchema.safeParse({ title: "X", priority: "urgent" });
    expect(r.success).toBe(false);
  });

  it("rejeita deadline malformada", () => {
    const r = taskCreateSchema.safeParse({ title: "X", deadline: "ontem" });
    expect(r.success).toBe(false);
  });

  it("aceita deadline ISO válida", () => {
    const r = taskCreateSchema.safeParse({ title: "X", deadline: "2026-12-31" });
    expect(r.success).toBe(true);
  });

  it("aceita string vazia em campos opcionais (FormData)", () => {
    const r = taskCreateSchema.safeParse({
      title: "X",
      description: "",
      assigneeId: "",
      deadline: "",
      origin: "",
    });
    expect(r.success).toBe(true);
  });
});

describe("taskUpdateSchema", () => {
  it("aceita patch parcial", () => {
    const r = taskUpdateSchema.safeParse({ priority: "alta" });
    expect(r.success).toBe(true);
  });

  it("aceita objecto vazio", () => {
    const r = taskUpdateSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("rejeita título vazio explícito", () => {
    const r = taskUpdateSchema.safeParse({ title: "" });
    expect(r.success).toBe(false);
  });
});

describe("taskMoveSchema", () => {
  it("aceita move válido", () => {
    const r = taskMoveSchema.safeParse({ toStatus: "em_curso", toIndex: 0 });
    expect(r.success).toBe(true);
  });

  it("coerces toIndex de string", () => {
    const r = taskMoveSchema.safeParse({ toStatus: "feito", toIndex: "3" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.toIndex).toBe(3);
  });

  it("rejeita toIndex negativo", () => {
    const r = taskMoveSchema.safeParse({ toStatus: "feito", toIndex: -1 });
    expect(r.success).toBe(false);
  });

  it("rejeita status inválido", () => {
    const r = taskMoveSchema.safeParse({ toStatus: "done", toIndex: 0 });
    expect(r.success).toBe(false);
  });
});

