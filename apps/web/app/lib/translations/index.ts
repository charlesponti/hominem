import i18next from 'i18next';

import { UI_TRANSLATIONS_EN } from './en';

const UI_NAMESPACE = 'ui';
const DEFAULT_LANGUAGE = 'en';

export function registerUiTranslations() {
  if (!i18next.isInitialized) {
    void i18next.init({
      resources: {
        [DEFAULT_LANGUAGE]: {
          [UI_NAMESPACE]: UI_TRANSLATIONS_EN,
        },
      },
      lng: DEFAULT_LANGUAGE,
      fallbackLng: DEFAULT_LANGUAGE,
      ns: [UI_NAMESPACE],
      defaultNS: UI_NAMESPACE,
      interpolation: {
        escapeValue: false,
      },
    });
    return;
  }

  if (!i18next.hasResourceBundle(DEFAULT_LANGUAGE, UI_NAMESPACE)) {
    i18next.addResourceBundle(DEFAULT_LANGUAGE, UI_NAMESPACE, UI_TRANSLATIONS_EN, true, false);
  }
}

export function translateUi(key: string, options?: Record<string, string | number | boolean>) {
  registerUiTranslations();
  return String(i18next.t(key, { ns: UI_NAMESPACE, ...options }));
}

export { UI_TRANSLATIONS_EN };
