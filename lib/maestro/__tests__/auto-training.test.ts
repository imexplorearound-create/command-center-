import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRecordValidation } = vi.hoisted(() => ({
  mockRecordValidation: vi.fn().mockResolvedValue({ scoreBefore: 0, scoreAfter: 2, delta: 2 }),
}));

vi.mock("@/lib/maestro/score-engine", () => ({
  recordValidation: mockRecordValidation,
  MAESTRO_INTERNAL: "maestro-internal",
}));

vi.mock("server-only", () => ({}));

import { hookAutoTrainingFromTask } from "../auto-training";

beforeEach(() => {
  mockRecordValidation.mockClear();
});

describe("hookAutoTrainingFromTask", () => {
  const task = {
    id: "t1",
    aiExtracted: true,
    validationStatus: "auto_confirmado",
    status: "em_curso",
  };

  it("regista confirmar quando AI-extraída + auto_confirmado transita para feito", () => {
    hookAutoTrainingFromTask(task, "feito", "p1");
    expect(mockRecordValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "confirmar",
        extractionType: "tarefa",
        entityType: "task",
        entityId: "t1",
        performedById: "p1",
      })
    );
  });

  it("ignora tarefas não-AI", () => {
    hookAutoTrainingFromTask({ ...task, aiExtracted: false }, "feito", "p1");
    expect(mockRecordValidation).not.toHaveBeenCalled();
  });

  it("ignora validationStatus != auto_confirmado", () => {
    hookAutoTrainingFromTask({ ...task, validationStatus: "confirmado" }, "feito", "p1");
    expect(mockRecordValidation).not.toHaveBeenCalled();
  });

  it("ignora se já estava em feito", () => {
    hookAutoTrainingFromTask({ ...task, status: "feito" }, "feito", "p1");
    expect(mockRecordValidation).not.toHaveBeenCalled();
  });

  it("ignora quando newStatus não é feito", () => {
    hookAutoTrainingFromTask(task, "em_curso", "p1");
    expect(mockRecordValidation).not.toHaveBeenCalled();
  });
});
