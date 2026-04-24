// Selector de templates do Maestro (F3 Voz).
//
// Avalia sinais do sistema e escolhe qual template aplicar. O
// contrato é intencionalmente puro: sem acesso a DB, sem Date.now()
// escondido — todos os sinais entram como argumento para facilitar
// testes determinísticos.

import {
  HERO_TEMPLATES,
  CREW_PHRASE_TEMPLATES,
  type HeroTemplateKey,
  type CrewPhraseKey,
} from "./templates";
import type {
  HeroSignals,
  HeroVoice,
  CrewPhraseSignals,
} from "./types";

export type { HeroSignals, HeroVoice, CrewPhraseSignals, CrewState } from "./types";

// ─── Hero ───────────────────────────────────────────────────────

export function pickHeroTemplate(s: HeroSignals): HeroTemplateKey {
  if (s.blockDecisions > 0) return "urgent";
  if (s.openDecisions > 0) return "active";
  // Fim de dia só quando está genuinamente calmo (>22h + sem decisões).
  if (s.hourOfDay >= 22 || s.hourOfDay < 6) return "winddown";
  return "calm";
}

export function selectHeroVoice(signals: HeroSignals): HeroVoice {
  const key = pickHeroTemplate(signals);
  return HERO_TEMPLATES[key](signals);
}

// ─── Crew phrase ────────────────────────────────────────────────

export function pickCrewPhraseTemplate(s: CrewPhraseSignals): CrewPhraseKey {
  // O state já reflecte a realidade (live/thinking/pending/idle).
  // O selector é um mapeamento 1-para-1 hoje; futuras variantes (por
  // role, por hora) passam por aqui sem alterar a API.
  return s.state;
}

export function selectCrewPhrase(signals: CrewPhraseSignals): string {
  const key = pickCrewPhraseTemplate(signals);
  return CREW_PHRASE_TEMPLATES[key](signals);
}
