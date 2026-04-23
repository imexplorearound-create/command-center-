/**
 * Tipo de retorno padrão para Server Actions.
 * Compatível com `useActionState` (a forma `{error}` é o sinal de falha).
 */
export type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { error: string };
