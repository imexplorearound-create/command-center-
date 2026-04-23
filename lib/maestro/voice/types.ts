// Tipos partilhados entre templates e selector.
// Separado para quebrar ciclo de imports entre os dois módulos.

export type HeroSignals = {
  userName: string;
  openDecisions: number;
  blockDecisions: number;
  projectsAtRisk: number;
  hourOfDay: number; // 0–23
};

export type HeroVoice = {
  h1: string;
  subtitle: string;
};

export type CrewState = "live" | "thinking" | "pending" | "idle";

export type CrewPhraseSignals = {
  state: CrewState;
  pendingDecisions: number;
  lastProject: string | null;
};
