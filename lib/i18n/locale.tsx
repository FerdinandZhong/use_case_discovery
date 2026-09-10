'use client';

// Lightweight runtime i18n: a React context holding the current locale (persisted
// per-browser in localStorage, like the response-draft token) plus a `t()` helper
// over the UI chrome dictionary. No framework / no URL locales — the app is a set of
// client components with a per-browser language preference.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { UI } from './ui';

export type Locale = 'en' | 'zh';
const STORAGE_KEY = 'ucd_lang';

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<LocaleCtx>({ locale: 'en', setLocale: () => {} });

function applyHtmlLang(l: Locale) {
  if (typeof document !== 'undefined') document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  // Restore the saved preference on mount (SSR renders 'en' first, then hydrates).
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved === 'en' || saved === 'zh') {
      setLocaleState(saved);
      applyHtmlLang(saved);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    applyHtmlLang(l);
  }, []);

  return <Ctx.Provider value={{ locale, setLocale }}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleCtx {
  return useContext(Ctx);
}

/** Interpolate {name} placeholders. */
function fill(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Returns a translator for UI chrome strings; falls back to EN, then the key itself. */
export function useT() {
  const { locale } = useContext(Ctx);
  return useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      fill((UI[locale] as Record<string, string>)[key] ?? UI.en[key] ?? key, vars),
    [locale],
  );
}
