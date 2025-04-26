import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    common: require('../public/locales/en/common.json')
  },
  ta: {
    common: require('../public/locales/ta/common.json')
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ta',
    defaultNS: 'common',
    supportedLngs: ['en', 'ta'],
    load: 'languageOnly',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n; 