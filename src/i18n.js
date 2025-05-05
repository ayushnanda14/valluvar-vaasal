import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    common: require('../public/locales/en/common.json')
  },
  ta: {
    common: require('../public/locales/ta/common.json')
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ta', // Force Tamil as default language
    fallbackLng: 'ta',
    defaultNS: 'common',
    supportedLngs: ['en', 'ta'],
    load: 'languageOnly',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n; 