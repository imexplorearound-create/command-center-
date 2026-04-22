export const CLASSIFICATION_LABELS: Record<string, string> = {
  bug: "Bug",
  suggestion: "Sugestão",
  question: "Questão",
  praise: "Elogio",
};

export const CLASSIFICATION_EMOJI: Record<string, string> = {
  bug: "🐛",
  suggestion: "💡",
  question: "❓",
  praise: "👏",
};

export const PRIORITY_LABELS: Record<string, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const SEVERITY_LABELS: Record<string, string> = {
  critica: "P0",
  alta: "P1",
  media: "P2",
  baixa: "P3",
};

export const SEVERITY_COLORS: Record<string, string> = {
  critica: "#D32F2F",
  alta: "#F57C00",
  media: "#FBC02D",
  baixa: "#607D8B",
};

export const SEVERITY_DESCRIPTIONS: Record<string, string> = {
  critica: "Bloqueia operação crítica · perda de dados · segurança",
  alta: "Afecta receita/conversão · workflow principal degradado",
  media: "Fricção notável com workaround · UX pobre em fluxo secundário",
  baixa: "Polish · cosmético · nice-to-have",
};
