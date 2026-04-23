/**
 * Templates de narração dos alertas passivos, em PT.
 * F2 usa strings simples; F3 substitui por voz contextual do Maestro.
 */

export type AlertKind =
  | "budget_warn"
  | "budget_block"
  | "opp_inactive"
  | "task_validation_stale"
  | "project_health_block";

type Context = Record<string, string | number | null | undefined>;

function render(template: string, ctx: Context): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    ctx[key] == null ? "" : String(ctx[key]),
  );
}

const TEMPLATES: Record<AlertKind, string> = {
  budget_warn: "{project} · orçamento a {pct}% — avaliar scope antes de estourar.",
  budget_block: "{project} · orçamento a {pct}% — stop. Novo ciclo ou reduzir.",
  opp_inactive: "{title} sem actividade há {days}d — recuperar ou fechar.",
  task_validation_stale:
    "{title} · extracção AI há {hours}h sem validação humana.",
  project_health_block: "{project} em health=block — destrancar antes de avançar.",
};

export function narrateAlert(kind: AlertKind, ctx: Context): string {
  return render(TEMPLATES[kind], ctx);
}
