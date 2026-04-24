/**
 * Fire-and-forget: executa uma async function em background e apanha
 * qualquer erro para não crashar o handler do caller. Logs o erro com label
 * identificador em vez de o silenciar.
 *
 * Usado em hot paths onde queremos devolver a resposta ao user sem esperar
 * pelo trabalho pesado (draft com LLM, notificações, sync externo).
 */
export function defer(label: string, fn: () => Promise<void>): void {
  fn().catch((err) => {
    console.warn(`[defer:${label}]`, err instanceof Error ? err.message : err);
  });
}
