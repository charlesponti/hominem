import i18n from 'i18next';

import enTranslations from '../locales/en.json';

i18n.init({
  resources: {
    en: {
      translation: enTranslations,
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  debug: false,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
