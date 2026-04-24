import { describe, it, expect } from "vitest";
import {
  isTransitionAllowed,
  rejectionTargetFor,
  ALLOWED_TRANSITIONS,
  approvalStatusEnum,
} from "../feedback-approval";

describe("approvalStatusEnum", () => {
  it("contém exactamente 6 estados", () => {
    expect(approvalStatusEnum.options).toHaveLength(6);
    expect(approvalStatusEnum.options).toEqual([
      "needs_review",
      "approved",
      "in_dev",
      "ready_for_verification",
      "verified",
      "archived",
    ]);
  });
});

describe("isTransitionAllowed — forward path", () => {
  const happy: Array<[string, string]> = [
    ["needs_review", "approved"],
    ["approved", "in_dev"],
    ["in_dev", "ready_for_verification"],
    ["ready_for_verification", "verified"],
  ];
  it.each(happy)("permite %s → %s", (from, to) => {
    expect(
      isTransitionAllowed(
        from as keyof typeof ALLOWED_TRANSITIONS,
        to as keyof typeof ALLOWED_TRANSITIONS,
      ),
    ).toBe(true);
  });
});

describe("isTransitionAllowed — archive (qualquer → archived excepto saída de archived)", () => {
  const fromStates = [
    "needs_review",
    "approved",
    "in_dev",
    "ready_for_verification",
    "verified",
  ] as const;
  it.each(fromStates)("permite %s → archived", (from) => {
    expect(isTransitionAllowed(from, "archived")).toBe(true);
  });
  it("archived não tem saída", () => {
    expect(ALLOWED_TRANSITIONS.archived).toHaveLength(0);
  });
});

describe("isTransitionAllowed — transições inválidas", () => {
  it("rejeita skip de estados (needs_review → in_dev)", () => {
    expect(isTransitionAllowed("needs_review", "in_dev")).toBe(false);
  });
  it("rejeita voltar atrás (verified → in_dev)", () => {
    expect(isTransitionAllowed("verified", "in_dev")).toBe(false);
  });
  it("rejeita approved → ready_for_verification sem passar por in_dev", () => {
    expect(isTransitionAllowed("approved", "ready_for_verification")).toBe(false);
  });
  it("rejeita transição para o mesmo estado", () => {
    expect(isTransitionAllowed("in_dev", "in_dev")).toBe(false);
  });
});

describe("rejectionTargetFor", () => {
  it("in_dev → rejeição vai para needs_review com origem=dev", () => {
    expect(rejectionTargetFor("in_dev")).toEqual({
      to: "needs_review",
      origin: "dev",
    });
  });
  it("ready_for_verification → rejeição vai para in_dev com origem=verifier", () => {
    expect(rejectionTargetFor("ready_for_verification")).toEqual({
      to: "in_dev",
      origin: "verifier",
    });
  });
  it("estados sem rejeição válida devolvem null", () => {
    expect(rejectionTargetFor("needs_review")).toBe(null);
    expect(rejectionTargetFor("approved")).toBe(null);
    expect(rejectionTargetFor("verified")).toBe(null);
    expect(rejectionTargetFor("archived")).toBe(null);
  });
});
