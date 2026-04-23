// Templates contextuais do Maestro (F3 Voz).
//
// Cada template é uma função `(slots) => string`. Separar templates
// (aqui) de selector (selector.ts) permite testar as duas superfícies
// de forma independente: o selector escolhe qual template usar, o
// template só interpola slots.
//
// DB2 (fechada 23 Abr 2026): só PT por agora. Quando chegar tenant EN,
// este módulo extrai para `lib/i18n/locales/*.json` por script.

import type { HeroSignals, HeroVoice, CrewPhraseSignals } from "./types";

// ─── Saudações por hora do dia ──────────────────────────────────

export type TimeOfDay = "dawn" | "morning" | "afternoon" | "evening" | "night";

export function timeOfDay(hour: number): TimeOfDay {
  if (hour < 6) return "dawn";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

export const GREETING_BY_TOD: Record<TimeOfDay, string> = {
  dawn: "Bom início",
  morning: "Bom dia",
  afternoon: "Boa tarde",
  evening: "Boa noite",
  night: "Ainda aí",
};

// ─── Hero H1 · padrões por contexto ─────────────────────────────

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

type HeroTemplate = (s: HeroSignals) => HeroVoice;

// Urgente: há decisões block (crítica). Texto direto, sem adjectivos.
const TPL_URGENT: HeroTemplate = (s) => {
  const greeting = GREETING_BY_TOD[timeOfDay(s.hourOfDay)];
  const dec = `${s.blockDecisions} ${pluralize(s.blockDecisions, "decisão crítica", "decisões críticas")}`;
  return {
    h1: `${greeting}, ${s.userName}. ${dec} à tua espera.`,
    subtitle: s.projectsAtRisk > 0
      ? `Também tens ${s.projectsAtRisk} ${pluralize(s.projectsAtRisk, "projecto", "projectos")} em risco. Começa pela coluna de decisões.`
      : "Começa pela coluna de decisões à direita. O resto pode esperar.",
  };
};

// Activo: há decisões mas nenhuma crítica.
const TPL_ACTIVE: HeroTemplate = (s) => {
  const greeting = GREETING_BY_TOD[timeOfDay(s.hourOfDay)];
  const dec = pluralize(s.openDecisions, "decisão", "decisões");
  return {
    h1: `${greeting}, ${s.userName}. Estás a ${s.openDecisions} ${dec} de um dia limpo.`,
    subtitle:
      "A tripulação processou eventos nas últimas horas. Abaixo o que precisa da tua atenção hoje.",
  };
};

// Calmo: sem decisões abertas, sem risco.
const TPL_CALM: HeroTemplate = (s) => {
  const greeting = GREETING_BY_TOD[timeOfDay(s.hourOfDay)];
  return {
    h1: `${greeting}, ${s.userName}. Nada urgente.`,
    subtitle: "Tens espaço para trabalho focado. O feed da manhã está em baixo.",
  };
};

// Fim de dia: hora tardia, calmo.
const TPL_WINDDOWN: HeroTemplate = (s) => ({
  h1: `Boa noite, ${s.userName}. A tripulação vai em piloto automático.`,
  subtitle: "Se fechares agora, o Maestro leva o feed até de manhã. Descansa.",
});

export const HERO_TEMPLATES = {
  urgent: TPL_URGENT,
  active: TPL_ACTIVE,
  calm: TPL_CALM,
  winddown: TPL_WINDDOWN,
} as const;

export type HeroTemplateKey = keyof typeof HERO_TEMPLATES;

// ─── Crew phrase · descrição viva por papel ─────────────────────

type CrewPhraseTemplate = (s: CrewPhraseSignals) => string;

const CREW_TPL_LIVE: CrewPhraseTemplate = (s) =>
  s.lastProject
    ? `a processar ${s.lastProject}`
    : "a processar eventos recentes";

const CREW_TPL_THINKING: CrewPhraseTemplate = () => "a avaliar agora";

const CREW_TPL_PENDING: CrewPhraseTemplate = (s) => {
  const n = s.pendingDecisions;
  if (n === 0) return "à espera de input";
  const dec = pluralize(n, "decisão", "decisões");
  return `${n} ${dec} à espera de ti`;
};

const CREW_TPL_IDLE: CrewPhraseTemplate = () => "em repouso";

export const CREW_PHRASE_TEMPLATES = {
  live: CREW_TPL_LIVE,
  thinking: CREW_TPL_THINKING,
  pending: CREW_TPL_PENDING,
  idle: CREW_TPL_IDLE,
} as const;

export type CrewPhraseKey = keyof typeof CREW_PHRASE_TEMPLATES;
