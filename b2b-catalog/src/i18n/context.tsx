'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { translations, type Language, type TranslationKey } from './translations';

interface I18nContextValue {
  lang: Language;
  t: TranslationKey;
  setLang: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'de',
  t: translations.de,
  setLang: () => {},
});

export function I18nProvider({
  children,
  defaultLang = 'de',
}: {
  children: ReactNode;
  defaultLang?: Language;
}) {
  const [lang, setLangState] = useState<Language>(defaultLang);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
  }, []);

  return (
    <I18nContext.Provider value={{ lang, t: translations[lang], setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
