"use client";

import { createContext, useContext, useMemo } from "react";
import type { TranslateFunction } from "./index";

type Dictionary = Record<string, string>;

const I18nContext = createContext<Dictionary>({});

export function I18nProvider({
  dictionary,
  children,
}: {
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={dictionary}>{children}</I18nContext.Provider>;
}

/**
 * Hook para aceder à função de tradução em Client Components.
 * Cria a função t() a partir do dicionário passado pelo Server Component.
 */
export function useT(): TranslateFunction {
  const dict = useContext(I18nContext);
  return useMemo(() => {
    return function t(
      key: string,
      params?: Record<string, string | number>
    ): string {
      let str = dict[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replaceAll(`{${k}}`, String(v));
        }
      }
      return str;
    };
  }, [dict]);
}
