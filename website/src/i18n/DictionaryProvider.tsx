"use client";

import { createContext, useContext, useState, useCallback, useTransition } from "react";
import type { Locale } from "./config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dictionary = Record<string, any>;

interface DictionaryContextType {
  dict: Dictionary;
  locale: Locale;
  switchLocale: (newLocale: Locale) => void;
}

const DictionaryContext = createContext<DictionaryContextType | null>(null);

export function DictionaryProvider({
  children,
  initialDict,
  initialLocale,
}: {
  children: React.ReactNode;
  initialDict: Dictionary;
  initialLocale: Locale;
}) {
  const [dict, setDict] = useState<Dictionary>(initialDict);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [, startTransition] = useTransition();

  const switchLocale = useCallback(
    (newLocale: Locale) => {
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      startTransition(() => {
        import(`./dictionaries/${newLocale}.json`).then((mod) => {
          setDict(mod.default);
          setLocale(newLocale);
        });
      });
    },
    []
  );

  return (
    <DictionaryContext.Provider value={{ dict, locale, switchLocale }}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary() {
  const ctx = useContext(DictionaryContext);
  if (!ctx) throw new Error("useDictionary must be used within DictionaryProvider");
  return ctx;
}
