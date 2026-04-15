/**
 * Helpers partilhados pelas Server Actions que recebem FormData.
 */

/** Lê um campo de FormData mantendo strings vazias como string vazia. Devolve undefined se não-string. */
export function field(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
}

/** Converte string vazia ou undefined em null (útil para colunas Prisma nullable). */
export function emptyToNull(v: string | undefined): string | null {
  return v === "" || v === undefined ? null : v;
}
