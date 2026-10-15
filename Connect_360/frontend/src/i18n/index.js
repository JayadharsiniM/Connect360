import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'ta', label: 'தமிழ்' },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'ta'],
    interpolation: { escapeValue: false },
    detection: {
      // Remember the user's choice; default to browser language, then English.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'c360_lang',
      caches: ['localStorage'],
    },
    // Never show raw keys if a translation is missing — fall back to English.
    returnEmptyString: false,
  });

export default i18n;
