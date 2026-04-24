import { describe, it, expect } from "vitest";
import {
  calcAutonomyPercent,
  classifyBudgetAlert,
  mapAlertSeverity,
  formatDeadline,
  DECISION_SEVERITY_RANK,
  computeCrewState,
  computeCrewLoad,
  formatSince,
  CREW_LOAD_CAP,
  buildHeroSignals,
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

describe("formatDeadline", () => {
  const NOW = new Date("2026-04-23T12:00:00Z").getTime();

  it("returns null when date is null", () => {
    expect(formatDeadline(null, NOW)).toBe(null);
  });

  it("returns 'atrasado' when date is in the past", () => {
    const d = new Date(NOW - 60 * 60 * 1000);
    expect(formatDeadline(d, NOW)).toBe("atrasado");
  });

  it("formats hours when < 24h away", () => {
    const d = new Date(NOW + 5 * 60 * 60 * 1000);
    expect(formatDeadline(d, NOW)).toBe("em 5h");
  });

  it("formats days when >= 24h away", () => {
    const d = new Date(NOW + 3 * 24 * 60 * 60 * 1000);
    expect(formatDeadline(d, NOW)).toBe("em 3d");
  });
});

describe("DECISION_SEVERITY_RANK", () => {
  it("orders block > warn > pend", () => {
    expect(DECISION_SEVERITY_RANK.block).toBeGreaterThan(DECISION_SEVERITY_RANK.warn);
    expect(DECISION_SEVERITY_RANK.warn).toBeGreaterThan(DECISION_SEVERITY_RANK.pend);
  });
});

describe("computeCrewState", () => {
  it("returns idle when no recent activity and no pending decisions", () => {
    expect(computeCrewState(null, 0)).toBe("idle");
  });

  it("returns pending when no recent activity but has open decisions", () => {
    expect(computeCrewState(null, 3)).toBe("pending");
  });

  it("returns thinking when activity < 1 min ago", () => {
    expect(computeCrewState(30 * 1000, 0)).toBe("thinking");
    expect(computeCrewState(30 * 1000, 5)).toBe("thinking");
  });

  it("returns live when activity 1-15 min ago", () => {
    expect(computeCrewState(5 * 60 * 1000, 0)).toBe("live");
    expect(computeCrewState(14 * 60 * 1000, 0)).toBe("live");
  });

  it("falls back to pending/idle when activity older than 15 min", () => {
    expect(computeCrewState(20 * 60 * 1000, 2)).toBe("pending");
    expect(computeCrewState(20 * 60 * 1000, 0)).toBe("idle");
  });
});

describe("computeCrewLoad", () => {
  it("returns 0 for zero items", () => {
    expect(computeCrewLoad(0, 0)).toBe(0);
  });

  it("scales linearly up to the cap", () => {
    expect(computeCrewLoad(1)).toBe(1 / CREW_LOAD_CAP);
    expect(computeCrewLoad(CREW_LOAD_CAP)).toBe(1);
  });

  it("saturates at 1 above the cap", () => {
    expect(computeCrewLoad(CREW_LOAD_CAP + 10)).toBe(1);
  });

  it("sums decisions and tasks", () => {
    expect(computeCrewLoad(2, 3)).toBe(1);
  });

  it("handles negative inputs gracefully", () => {
    expect(computeCrewLoad(-5, 0)).toBe(0);
  });
});

describe("formatSince", () => {
  it("returns 'agora' for under a minute", () => {
    expect(formatSince(30 * 1000)).toBe("agora");
  });

  it("returns minutes for under an hour", () => {
    expect(formatSince(5 * 60 * 1000)).toBe("há 5min");
  });

  it("returns hours for under a day", () => {
    expect(formatSince(3 * 60 * 60 * 1000)).toBe("há 3h");
  });

  it("returns days for a day or more", () => {
    expect(formatSince(2 * 24 * 60 * 60 * 1000)).toBe("há 2d");
  });
});

describe("buildHeroSignals", () => {
  const now = new Date("2026-04-23T14:30:00Z"); // 14h UTC → afternoon

  it("conta openDecisions como total e blockDecisions como subset", () => {
    const signals = buildHeroSignals({
      userName: "Miguel",
      decisions: [
        { severity: "block" },
        { severity: "warn" },
        { severity: "block" },
        { severity: "pend" },
      ],
      projectsAtRiskCount: 2,
      now,
    });
    expect(signals.userName).toBe("Miguel");
    expect(signals.openDecisions).toBe(4);
    expect(signals.blockDecisions).toBe(2);
    expect(signals.projectsAtRisk).toBe(2);
  });

  it("lista vazia → openDecisions=0 e blockDecisions=0", () => {
    const signals = buildHeroSignals({
      userName: "Miguel",
      decisions: [],
      projectsAtRiskCount: 0,
      now,
    });
    expect(signals.openDecisions).toBe(0);
    expect(signals.blockDecisions).toBe(0);
  });

  it("captura hourOfDay do `now` injectado (determinismo em tests)", () => {
    const signals = buildHeroSignals({
      userName: "x",
      decisions: [],
      projectsAtRiskCount: 0,
      now: new Date("2026-04-23T09:00:00Z"),
    });
    // getHours() retorna na timezone local — o teste apenas garante que o
    // valor vem do `now` injectado, não de `new Date()` escondido.
    expect(signals.hourOfDay).toBe(new Date("2026-04-23T09:00:00Z").getHours());
  });

  it("sem `now` cai para `new Date()` em runtime", () => {
    const signals = buildHeroSignals({
      userName: "x",
      decisions: [],
      projectsAtRiskCount: 0,
    });
    expect(signals.hourOfDay).toBeGreaterThanOrEqual(0);
    expect(signals.hourOfDay).toBeLessThanOrEqual(23);
  });
});
