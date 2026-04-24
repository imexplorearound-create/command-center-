import { describe, it, expect } from "vitest";
import {
  extractMentionedTestCaseCodes,
  resolveTestCaseFromVoice,
} from "../resolve-test-case";

describe("extractMentionedTestCaseCodes", () => {
  it("devolve array vazio sem input", () => {
    expect(extractMentionedTestCaseCodes(null)).toEqual([]);
    expect(extractMentionedTestCaseCodes(undefined)).toEqual([]);
    expect(extractMentionedTestCaseCodes("")).toEqual([]);
  });

  it("extrai único match", () => {
    expect(extractMentionedTestCaseCodes("Estou no T-042 a testar")).toEqual(["T-042"]);
  });

  it("normaliza para maiúsculas", () => {
    expect(extractMentionedTestCaseCodes("testando t-1 agora")).toEqual(["T-1"]);
  });

  it("remove duplicados preservando ordem", () => {
    expect(
      extractMentionedTestCaseCodes("T-042 falha. Volto ao T-042 e passo ao T-043."),
    ).toEqual(["T-042", "T-043"]);
  });

  it("devolve múltiplos matches distintos", () => {
    expect(
      extractMentionedTestCaseCodes("Estive em T-001 depois T-002 e terminei em T-003."),
    ).toEqual(["T-001", "T-002", "T-003"]);
  });

  it("ignora texto sem padrão T-N", () => {
    expect(extractMentionedTestCaseCodes("o botão não clica")).toEqual([]);
  });

  it("não apanha T-abc (precisa de dígitos)", () => {
    expect(extractMentionedTestCaseCodes("testando T-abc e T-42")).toEqual(["T-42"]);
  });
});

describe("resolveTestCaseFromVoice", () => {
  it("dropdown ganha contra regex — kind=explicit", () => {
    const r = resolveTestCaseFromVoice({
      dropdownCode: "T-042",
      transcript: "Estou no T-042 mas T-100 também falha",
    });
    expect(r).toEqual({
      kind: "explicit",
      code: "T-042",
      mentionedCodes: ["T-100"],
    });
  });

  it("dropdown sem transcrição", () => {
    const r = resolveTestCaseFromVoice({ dropdownCode: "T-001", transcript: null });
    expect(r).toEqual({ kind: "explicit", code: "T-001", mentionedCodes: [] });
  });

  it("dropdown duplicado com menção — não entra em mentionedCodes", () => {
    const r = resolveTestCaseFromVoice({
      dropdownCode: "T-042",
      transcript: "aqui em t-042 o botão falha",
    });
    expect(r.kind).toBe("explicit");
    expect(r.mentionedCodes).toEqual([]);
  });

  it("sem dropdown + 1 match → single", () => {
    const r = resolveTestCaseFromVoice({
      dropdownCode: null,
      transcript: "Estou no T-007 a confirmar",
    });
    expect(r).toEqual({ kind: "single", code: "T-007", mentionedCodes: [] });
  });

  it("sem dropdown + 0 matches → none", () => {
    const r = resolveTestCaseFromVoice({ dropdownCode: null, transcript: "bug genérico" });
    expect(r).toEqual({ kind: "none", mentionedCodes: [] });
  });

  it("sem dropdown + N matches → ambiguous com todos em mentionedCodes", () => {
    const r = resolveTestCaseFromVoice({
      dropdownCode: null,
      transcript: "T-001 e T-002 falham",
    });
    expect(r).toEqual({
      kind: "ambiguous",
      mentionedCodes: ["T-001", "T-002"],
    });
  });

  it("aceita dropdown em minúsculas (normaliza)", () => {
    const r = resolveTestCaseFromVoice({ dropdownCode: "t-005", transcript: null });
    expect(r).toMatchObject({ kind: "explicit", code: "T-005" });
  });
});
