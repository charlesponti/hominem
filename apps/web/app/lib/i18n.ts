import i18n from 'i18next';

import { registerUiTranslations } from '~/lib/translations';

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

registerUiTranslations();
