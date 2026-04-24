const TEST_CASE_REGEX = /T-\d+/gi;

/**
 * Extrai todos os códigos "T-NNN" mencionados numa transcrição.
 * Normaliza para maiúsculas e retorna únicos (preserva ordem).
 */
export function extractMentionedTestCaseCodes(transcript: string | null | undefined): string[] {
  if (!transcript) return [];
  const matches = transcript.match(TEST_CASE_REGEX);
  if (!matches) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const normalized = m.toUpperCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}

/**
 * Resolve um FeedbackItem para um TestCase concreto. A ordem de preferência:
 *
 * 1. Se o tester escolheu `testCaseCode` no dropdown → usa esse (único match
 *    entra directo; os restantes mencionados ficam em `mentionedCodes` para
 *    a triagem referenciar).
 * 2. Sem dropdown e 1 match na transcrição → resolve esse código.
 * 3. Sem dropdown e 0 ou N matches → fica `null`. Se foram N matches, todos
 *    ficam em `mentionedCodes` para o triager reparar a ambiguidade.
 *
 * A função é pura: só decide o que procurar na DB e o que guardar em
 * contextSnapshot. O caller faz o lookup (porque precisa do Prisma client).
 */
export type TestCaseResolution =
  | { kind: "explicit"; code: string; mentionedCodes: string[] }
  | { kind: "single"; code: string; mentionedCodes: string[] }
  | { kind: "none"; mentionedCodes: string[] }
  | { kind: "ambiguous"; mentionedCodes: string[] };

export function resolveTestCaseFromVoice(input: {
  dropdownCode?: string | null;
  transcript?: string | null;
}): TestCaseResolution {
  const mentioned = extractMentionedTestCaseCodes(input.transcript);

  if (input.dropdownCode) {
    const dropdownNormalized = input.dropdownCode.toUpperCase();
    const extras = mentioned.filter((c) => c !== dropdownNormalized);
    return { kind: "explicit", code: dropdownNormalized, mentionedCodes: extras };
  }

  if (mentioned.length === 1) {
    return { kind: "single", code: mentioned[0]!, mentionedCodes: [] };
  }

  if (mentioned.length >= 2) {
    return { kind: "ambiguous", mentionedCodes: mentioned };
  }

  return { kind: "none", mentionedCodes: [] };
}
