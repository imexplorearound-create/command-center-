import { describe, it, expect } from "vitest";
import { narrateAlert } from "../alert-narrator";

describe("narrateAlert", () => {
  it("substitui slots do budget_warn", () => {
    expect(narrateAlert("budget_warn", { project: "Portiqa", pct: 94 })).toBe(
      "Portiqa · orçamento a 94% — avaliar scope antes de estourar.",
    );
  });

  it("substitui slots do budget_block", () => {
    expect(narrateAlert("budget_block", { project: "Portiqa", pct: 112 })).toBe(
      "Portiqa · orçamento a 112% — stop. Novo ciclo ou reduzir.",
    );
  });

  it("substitui slots do opp_inactive", () => {
    expect(narrateAlert("opp_inactive", { title: "Grupo Pestana", days: 18 })).toBe(
      "Grupo Pestana sem actividade há 18d — recuperar ou fechar.",
    );
  });

  it("substitui slots do task_validation_stale", () => {
    expect(
      narrateAlert("task_validation_stale", { title: "Rever contrato", hours: 72 }),
    ).toBe("Rever contrato · extracção AI há 72h sem validação humana.");
  });

  it("substitui slots do project_health_block", () => {
    expect(narrateAlert("project_health_block", { project: "Andamar" })).toBe(
      "Andamar em health=block — destrancar antes de avançar.",
    );
  });

  it("substitui slots em falta por string vazia (defensivo)", () => {
    expect(narrateAlert("opp_inactive", { title: "X" })).toBe(
      "X sem actividade há d — recuperar ou fechar.",
    );
  });
});
