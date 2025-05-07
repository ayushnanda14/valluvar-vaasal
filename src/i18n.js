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

// Function to get saved language from localStorage
const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    const savedLng = localStorage.getItem('i18nextLng');
    if (savedLng && resources[savedLng]) { // Check if saved language is valid/supported
      return savedLng;
    }
  }
  return 'ta'; // Default to Tamil if nothing valid is saved or not in browser
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(), // Set initial language from localStorage or default
    fallbackLng: 'ta',
    defaultNS: 'common',
    supportedLngs: ['en', 'ta'],
    load: 'languageOnly',
    interpolation: {
      escapeValue: false
    }
  });

// Listen to language changes and save to localStorage
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('i18nextLng', lng);
  }
});

export default i18n; 