import { describe, it, expect } from "vitest";
import {
  decideGating,
  applyDelta,
  clampScore,
  thresholdFor,
  THRESHOLDS,
  SENSITIVE_CAP,
  EXTRACTION_TYPES,
} from "../trust-rules";

describe("thresholdFor", () => {
  it("0 → aprendizagem", () => expect(thresholdFor(0)).toBe("aprendizagem"));
  it("30 → aprendizagem", () => expect(thresholdFor(30)).toBe("aprendizagem"));
  it("31 → calibracao", () => expect(thresholdFor(31)).toBe("calibracao"));
  it("50 → calibracao", () => expect(thresholdFor(50)).toBe("calibracao"));
  it("51 → confianca", () => expect(thresholdFor(51)).toBe("confianca"));
  it("70 → confianca", () => expect(thresholdFor(70)).toBe("confianca"));
  it("71 → autonomia", () => expect(thresholdFor(71)).toBe("autonomia"));
  it("90 → autonomia", () => expect(thresholdFor(90)).toBe("autonomia"));
  it("91 → pleno", () => expect(thresholdFor(91)).toBe("pleno"));
  it("100 → pleno", () => expect(thresholdFor(100)).toBe("pleno"));
});

describe("THRESHOLDS shape", () => {
  it("cobre 0-100 sem buracos", () => {
    expect(THRESHOLDS.aprendizagem.min).toBe(0);
    expect(THRESHOLDS.pleno.max).toBe(100);
  });
});

describe("decideGating", () => {
  it("score 0 → pending", () => {
    expect(decideGating({ score: 0 })).toBe("pending");
  });

  it("score 30 → pending", () => {
    expect(decideGating({ score: 30 })).toBe("pending");
  });

  it("score 40 sem confiança alta → pending", () => {
    expect(decideGating({ score: 40 })).toBe("pending");
  });

  it("score 40 com confiança 0.9 → executed", () => {
    expect(decideGating({ score: 40, confidence: 0.9 })).toBe("executed");
  });

  it("score 40 com confiança 0.85 (limite) → pending", () => {
    expect(decideGating({ score: 40, confidence: 0.85 })).toBe("pending");
  });

  it("score 51 → executed (confiança)", () => {
    expect(decideGating({ score: 51 })).toBe("executed");
  });

  it("score 100 → executed", () => {
    expect(decideGating({ score: 100 })).toBe("executed");
  });

  it("acção sensível com score 90 → cap a 50, fica pending", () => {
    expect(decideGating({ score: 90, isSensitive: true })).toBe("pending");
  });

  it("acção sensível com score 90 + confiança 0.95 → executed (regra calibração)", () => {
    expect(
      decideGating({ score: 90, isSensitive: true, confidence: 0.95 })
    ).toBe("executed");
  });

  it("acção sensível com score 100 → cap a 50, pending sem confiança", () => {
    expect(decideGating({ score: 100, isSensitive: true })).toBe("pending");
  });
});

describe("applyDelta", () => {
  it("confirmar → +2", () => expect(applyDelta("confirmar")).toBe(2));
  it("editar → 0", () => expect(applyDelta("editar")).toBe(0));
  it("rejeitar → -5", () => expect(applyDelta("rejeitar")).toBe(-5));
});

describe("clampScore", () => {
  it("dentro do range", () => expect(clampScore(50, 5)).toBe(55));
  it("não passa de 100", () => expect(clampScore(98, 5)).toBe(100));
  it("não baixa de 0", () => expect(clampScore(2, -10)).toBe(0));
  it("delta negativo dentro do range", () => expect(clampScore(50, -5)).toBe(45));
});

describe("EXTRACTION_TYPES", () => {
  it("cobre todas as 8 categorias do spec", () => {
    expect(EXTRACTION_TYPES).toHaveLength(8);
    expect(EXTRACTION_TYPES).toContain("tarefa");
    expect(EXTRACTION_TYPES).toContain("decisao");
    expect(EXTRACTION_TYPES).toContain("resumo");
    expect(EXTRACTION_TYPES).toContain("prioridade");
    expect(EXTRACTION_TYPES).toContain("responsavel");
    expect(EXTRACTION_TYPES).toContain("conteudo");
    expect(EXTRACTION_TYPES).toContain("ligacao_codigo");
  });
});

describe("SENSITIVE_CAP", () => {
  it("é 50", () => expect(SENSITIVE_CAP).toBe(50));
});
