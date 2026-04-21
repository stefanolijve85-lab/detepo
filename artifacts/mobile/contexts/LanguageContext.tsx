import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NativeModules, Platform } from "react-native";

import { LOCALES, MONTHS, TRANSLATIONS, type Language } from "@/i18n/translations";

const STORAGE_KEY = "detepo_language";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: string;
  months: string[];
  monthsShort: string[];
  formatNumber: (n: number) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function detectDeviceLanguage(): Language {
  try {
    const raw =
      Platform.OS === "ios"
        ? NativeModules.SettingsManager?.settings?.AppleLocale ||
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        : NativeModules.I18nManager?.localeIdentifier;
    const code = String(raw || "").toLowerCase().slice(0, 2);
    if (["nl", "en", "de", "es", "it", "fr", "pt"].includes(code)) return code as Language;
  } catch {
    // ignore
  }
  return "nl";
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? `{${key}}` : String(v);
  });
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("nl");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && stored in TRANSLATIONS) {
          setLanguageState(stored as Language);
        } else {
          setLanguageState(detectDeviceLanguage());
        }
      })
      .catch(() => setLanguageState(detectDeviceLanguage()))
      .finally(() => setHydrated(true));
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = TRANSLATIONS[language] ?? TRANSLATIONS.nl;
      const template = dict[key] ?? TRANSLATIONS.nl[key] ?? key;
      return interpolate(template, vars);
    },
    [language]
  );

  const locale = LOCALES[language] ?? "nl-NL";
  const months = MONTHS[language] ?? MONTHS.nl;
  const monthsShort = useMemo(() => months.map((m) => m.slice(0, 3)), [months]);

  const formatNumber = useCallback(
    (n: number) => {
      try {
        return n.toLocaleString(locale);
      } catch {
        return String(n);
      }
    },
    [locale]
  );

  const value = useMemo<LanguageContextType>(
    () => ({ language, setLanguage, t, locale, months, monthsShort, formatNumber }),
    [language, setLanguage, t, locale, months, monthsShort, formatNumber]
  );

  if (!hydrated) return null;
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
