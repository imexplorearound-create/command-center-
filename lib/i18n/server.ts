import "server-only";
import { cache } from "react";
import { getTenantLocale } from "@/lib/tenant";
import { createTranslator, type TranslateFunction } from "./index";

const cachedTranslator = cache((locale: string): TranslateFunction =>
  createTranslator(locale)
);

/**
 * Helper server-side: resolve locale da sessão e devolve translator deduplicado
 * por request via React cache().
 */
export async function getServerT(): Promise<TranslateFunction> {
  return cachedTranslator(await getTenantLocale());
}
