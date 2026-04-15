"use client";

import { createContext, useContext, useMemo, type ReactNode, Fragment } from "react";
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

type RichComponents = Record<string, (children: ReactNode) => ReactNode>;

/**
 * Renders a translation with inline markup. Template uses pseudo-tags like
 * "Paste <b>Server URL</b> (top)" and `components: { b: (c) => <strong>{c}</strong> }`
 * maps each tag to a React element. Unknown tags render their children as plain text.
 */
export function useTRich(): (key: string, components: RichComponents) => ReactNode {
  const t = useT();
  return useMemo(() => {
    return (key: string, components: RichComponents): ReactNode => {
      const template = t(key);
      const tagNames = Object.keys(components).join("|");
      if (!tagNames) return template;
      const re = new RegExp(`<(${tagNames})>([\\s\\S]*?)</\\1>`, "g");
      const parts: ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let keyIdx = 0;
      while ((match = re.exec(template)) !== null) {
        if (match.index > lastIndex) parts.push(template.slice(lastIndex, match.index));
        const [, tag, inner] = match;
        parts.push(<Fragment key={keyIdx++}>{components[tag](inner)}</Fragment>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < template.length) parts.push(template.slice(lastIndex));
      return parts;
    };
  }, [t]);
}
