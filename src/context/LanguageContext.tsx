import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readJson, writeJson, onExternalStorageChange } from "../lib/storage/localStorageEngine";
import { APP_STRINGS, type AppStrings, type Language } from "../lib/i18n/appStrings";

const LANGUAGE_KEY = "app.language.v1";
const VALID_LANGUAGES: Language[] = ["tj", "ru", "en"];

function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (VALID_LANGUAGES as string[]).includes(value);
}

/**
 * First-load-only fallbacks, checked in order, before defaulting to Russian:
 * 1. This provider's own key — the real source of truth once anyone has used the picker here.
 * 2. The pre-login LoginPage's own "app.language" choice (components/auth/loginTranslations.ts) —
 *    a deliberately separate, already-working system; reading it here (once) just means picking
 *    Tajik on the login screen carries into the authenticated app instead of resetting to Russian.
 * 3. The general "app.settings.v1" blob's old `language` field, from earlier builds where the
 *    Settings page saved it but nothing ever read it back (the original bug this fixes).
 */
function readInitialLanguage(): Language {
  const stored = readJson<Language>(LANGUAGE_KEY);
  if (isLanguage(stored)) return stored;

  const loginLanguage = readJson<Language>("app.language");
  if (isLanguage(loginLanguage)) return loginLanguage;

  const legacySettings = readJson<{ language?: unknown }>("app.settings.v1");
  if (legacySettings && isLanguage(legacySettings.language)) return legacySettings.language;

  return "ru";
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  /** The full translated-strings object for the current language — destructure what you need. */
  strings: AppStrings;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readInitialLanguage());

  useEffect(
    () =>
      onExternalStorageChange(LANGUAGE_KEY, () => {
        const stored = readJson<Language>(LANGUAGE_KEY);
        if (isLanguage(stored)) setLanguageState(stored);
      }),
    [],
  );

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    writeJson(LANGUAGE_KEY, next);
  }, []);

  const strings = useMemo(() => APP_STRINGS[language], [language]);

  const value = useMemo<LanguageContextValue>(() => ({ language, setLanguage, strings }), [language, setLanguage, strings]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
