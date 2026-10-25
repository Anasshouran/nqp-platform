import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '../i18n/locales/ar.json';
import en from '../i18n/locales/en.json';

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        ar: { translation: ar },
        en: { translation: en },
      },
      lng: 'ar',
      fallbackLng: 'ar',
      interpolation: { escapeValue: false },
    });
}
