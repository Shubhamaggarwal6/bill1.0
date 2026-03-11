import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Language, translations, getStoredLanguage, setStoredLanguage, hasChosenLanguage } from '@/lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  hasChosen: boolean;
  setHasChosen: (v: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>(getStoredLanguage());
  const [hasChosen, setHasChosen] = useState(hasChosenLanguage());

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    setStoredLanguage(lang);
    setHasChosen(true);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let text = translations[language]?.[key] || translations.hinglish[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, hasChosen, setHasChosen }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
