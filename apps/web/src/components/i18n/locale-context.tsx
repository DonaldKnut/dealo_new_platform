'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  dictionaries,
  isLocale,
  LOCALE_META,
  type Locale,
  type TranslationKey,
} from './dictionaries';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);
const STORAGE_KEY = 'dealo.locale';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) {
      setLocaleState(stored);
      document.documentElement.lang = LOCALE_META[stored].htmlLang;
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = LOCALE_META[next].htmlLang;
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key,
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
