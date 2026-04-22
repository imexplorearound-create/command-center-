import { describe, it, expect } from "vitest";
import {
  calcAutonomyPercent,
  classifyBudgetAlert,
  mapAlertSeverity,
} from "../dashboard-helpers";

describe("calcAutonomyPercent", () => {
  it("returns 0 when there are no tasks at all", () => {
    expect(calcAutonomyPercent(0, 0)).toBe(0);
  });

  it("returns 0 when no AI tasks were accepted", () => {
    expect(calcAutonomyPercent(0, 10)).toBe(0);
  });

  it("returns 100 when every task was AI-accepted", () => {
    expect(calcAutonomyPercent(10, 10)).toBe(100);
  });

  it("rounds to the nearest whole percent", () => {
    expect(calcAutonomyPercent(1, 3)).toBe(33); // 33.33…
    expect(calcAutonomyPercent(2, 3)).toBe(67); // 66.66…
  });

  it("clamps to [0, 100] if inputs are malformed", () => {
    expect(calcAutonomyPercent(15, 10)).toBe(100); // more AI than total → 100 ceiling
    expect(calcAutonomyPercent(-1, 10)).toBe(0);
  });
});

describe("classifyBudgetAlert", () => {
  it("returns null when allocated is 0 or negative", () => {
    expect(classifyBudgetAlert(100, 0)).toBe(null);
    expect(classifyBudgetAlert(100, -50)).toBe(null);
  });

  it("returns null when execution is below 90%", () => {
    expect(classifyBudgetAlert(89, 100)).toBe(null);
    expect(classifyBudgetAlert(0, 100)).toBe(null);
  });

  it("returns 'warn' between 90% and 100%", () => {
    expect(classifyBudgetAlert(90, 100)).toBe("warn");
    expect(classifyBudgetAlert(99.9, 100)).toBe("warn");
  });

  it("returns 'block' at or above 100%", () => {
    expect(classifyBudgetAlert(100, 100)).toBe("block");
    expect(classifyBudgetAlert(150, 100)).toBe("block");
  });
});

describe("mapAlertSeverity", () => {
  it("maps high-severity variants to 'block'", () => {
    expect(mapAlertSeverity("high")).toBe("block");
    expect(mapAlertSeverity("critical")).toBe("block");
    expect(mapAlertSeverity("block")).toBe("block");
  });

  it("maps medium-severity variants to 'warn' (including schema default 'warning')", () => {
    expect(mapAlertSeverity("medium")).toBe("warn");
    expect(mapAlertSeverity("warn")).toBe("warn");
    expect(mapAlertSeverity("warning")).toBe("warn");
  });

  it("defaults everything else to 'pend'", () => {
    expect(mapAlertSeverity("low")).toBe("pend");
    expect(mapAlertSeverity(undefined)).toBe("pend");
    expect(mapAlertSeverity(null)).toBe("pend");
    expect(mapAlertSeverity("")).toBe("pend");
    expect(mapAlertSeverity("anything-unknown")).toBe("pend");
  });
});
