import ptPT from "./locales/pt-PT.json";
import en from "./locales/en.json";

type Dictionary = Record<string, string>;

const dictionaries: Record<string, Dictionary> = {
  "pt-PT": ptPT,
  en,
};

export type TranslateFunction = (
  key: string,
  params?: Record<string, string | number>
) => string;

/**
 * Cria uma função de tradução para o locale dado.
 * Fallback para pt-PT se o locale não existir.
 * Se a chave não existir no dicionário, devolve a própria chave.
 */
export function createTranslator(locale: string): TranslateFunction {
  const dict = dictionaries[locale] ?? dictionaries["pt-PT"];
  return function t(
    key: string,
    params?: Record<string, string | number>
  ): string {
    let str = dict[key] ?? dictionaries["pt-PT"][key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replaceAll(`{${k}}`, String(v));
      }
    }
    return str;
  };
}

export function getDictionary(locale: string): Dictionary {
  return dictionaries[locale] ?? dictionaries["pt-PT"];
}

export const supportedLocales = Object.keys(dictionaries);
