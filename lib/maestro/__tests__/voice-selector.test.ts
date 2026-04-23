import { describe, it, expect } from "vitest";
import {
  pickHeroTemplate,
  selectHeroVoice,
  pickCrewPhraseTemplate,
  selectCrewPhrase,
} from "../voice/selector";
import { timeOfDay, GREETING_BY_TOD } from "../voice/templates";
import type { HeroSignals, CrewPhraseSignals } from "../voice/types";

// ─── Helpers ────────────────────────────────────────────────────

function hero(overrides: Partial<HeroSignals> = {}): HeroSignals {
  return {
    userName: "Miguel",
    openDecisions: 0,
    blockDecisions: 0,
    projectsAtRisk: 0,
    hourOfDay: 10,
    ...overrides,
  };
}

function crew(overrides: Partial<CrewPhraseSignals> = {}): CrewPhraseSignals {
  return {
    state: "idle",
    pendingDecisions: 0,
    lastProject: null,
    ...overrides,
  };
}

// ─── timeOfDay ─────────────────────────────────────────────────

describe("timeOfDay", () => {
  it("classifica as 6 janelas do dia", () => {
    expect(timeOfDay(3)).toBe("dawn");
    expect(timeOfDay(8)).toBe("morning");
    expect(timeOfDay(14)).toBe("afternoon");
    expect(timeOfDay(20)).toBe("evening");
    expect(timeOfDay(23)).toBe("night");
  });

  it("os limites caem no bucket seguinte", () => {
    expect(timeOfDay(6)).toBe("morning");
    expect(timeOfDay(12)).toBe("afternoon");
    expect(timeOfDay(18)).toBe("evening");
    expect(timeOfDay(22)).toBe("night");
  });
});

// ─── pickHeroTemplate ──────────────────────────────────────────

describe("pickHeroTemplate", () => {
  it("escolhe 'urgent' quando há decisões block", () => {
    expect(pickHeroTemplate(hero({ openDecisions: 5, blockDecisions: 2 }))).toBe("urgent");
  });

  it("'urgent' ganha a 'winddown' mesmo à noite", () => {
    expect(pickHeroTemplate(hero({ hourOfDay: 23, blockDecisions: 1 }))).toBe("urgent");
  });

  it("'active' quando há decisões abertas mas nenhuma block", () => {
    expect(pickHeroTemplate(hero({ openDecisions: 3 }))).toBe("active");
  });

  it("'winddown' após 22h se calmo", () => {
    expect(pickHeroTemplate(hero({ hourOfDay: 23 }))).toBe("winddown");
    expect(pickHeroTemplate(hero({ hourOfDay: 2 }))).toBe("winddown");
  });

  it("'calm' entre 6h e 22h sem nada aberto", () => {
    expect(pickHeroTemplate(hero({ hourOfDay: 10 }))).toBe("calm");
    expect(pickHeroTemplate(hero({ hourOfDay: 18 }))).toBe("calm");
  });
});

// ─── selectHeroVoice ───────────────────────────────────────────

describe("selectHeroVoice", () => {
  it("urgent menciona o número de decisões críticas", () => {
    const v = selectHeroVoice(hero({ openDecisions: 3, blockDecisions: 1, hourOfDay: 9 }));
    expect(v.h1).toContain("Miguel");
    expect(v.h1).toContain("1 decisão crítica");
    expect(v.subtitle.length).toBeGreaterThan(0);
  });

  it("urgente com projectos em risco menciona-os no subtítulo", () => {
    const v = selectHeroVoice(hero({ blockDecisions: 2, projectsAtRisk: 3 }));
    expect(v.h1).toContain("2 decisões críticas");
    expect(v.subtitle).toContain("3");
    expect(v.subtitle).toContain("projectos em risco");
  });

  it("pluraliza 'decisão' vs 'decisões' correctamente", () => {
    const singular = selectHeroVoice(hero({ openDecisions: 1, hourOfDay: 9 }));
    const plural = selectHeroVoice(hero({ openDecisions: 4, hourOfDay: 9 }));
    expect(singular.h1).toContain("1 decisão de um dia limpo");
    expect(plural.h1).toContain("4 decisões de um dia limpo");
  });

  it("calmo de manhã — 'Bom dia' + 'Nada urgente'", () => {
    const v = selectHeroVoice(hero({ hourOfDay: 10 }));
    expect(v.h1.startsWith("Bom dia, Miguel")).toBe(true);
    expect(v.h1).toContain("Nada urgente");
  });

  it("winddown à noite muda tom para fechar o dia", () => {
    const v = selectHeroVoice(hero({ hourOfDay: 23 }));
    expect(v.h1).toContain("Boa noite");
    expect(v.subtitle).toContain("Descansa");
  });

  it("saudações variam por hora do dia", () => {
    expect(selectHeroVoice(hero({ hourOfDay: 9 })).h1).toContain(GREETING_BY_TOD.morning);
    expect(selectHeroVoice(hero({ hourOfDay: 14, openDecisions: 1 })).h1).toContain(GREETING_BY_TOD.afternoon);
  });
});

// ─── pickCrewPhraseTemplate / selectCrewPhrase ─────────────────

describe("selectCrewPhrase", () => {
  it("live com lastProject menciona-o", () => {
    expect(selectCrewPhrase(crew({ state: "live", lastProject: "Portiqa" })))
      .toBe("a processar Portiqa");
  });

  it("live sem lastProject cai para frase genérica", () => {
    expect(selectCrewPhrase(crew({ state: "live" }))).toBe("a processar eventos recentes");
  });

  it("thinking é consistente e curto (<= 3 palavras)", () => {
    const phrase = selectCrewPhrase(crew({ state: "thinking" }));
    expect(phrase.split(" ").length).toBeLessThanOrEqual(3);
  });

  it("pending menciona o número de decisões", () => {
    expect(selectCrewPhrase(crew({ state: "pending", pendingDecisions: 1 })))
      .toContain("1 decisão");
    expect(selectCrewPhrase(crew({ state: "pending", pendingDecisions: 3 })))
      .toContain("3 decisões");
  });

  it("pending com 0 cai para fallback (não diz '0 decisões')", () => {
    const phrase = selectCrewPhrase(crew({ state: "pending", pendingDecisions: 0 }));
    expect(phrase).not.toContain("0");
    expect(phrase.length).toBeGreaterThan(0);
  });

  it("idle devolve 'em repouso'", () => {
    expect(selectCrewPhrase(crew({ state: "idle" }))).toBe("em repouso");
  });

  it("pickCrewPhraseTemplate é 1-para-1 com state (invariante para F3B)", () => {
    for (const s of ["live", "thinking", "pending", "idle"] as const) {
      expect(pickCrewPhraseTemplate(crew({ state: s }))).toBe(s);
    }
  });
});
