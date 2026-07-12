import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import esMX from './locales/es-MX.json';
import en from './locales/en.json';

// Idioma por defecto: español (es-MX). Se persiste la elección en localStorage.
const saved = localStorage.getItem('openpos_lang');

void i18n.use(initReactI18next).init({
  resources: {
    'es-MX': { translation: esMX },
    en: { translation: en },
  },
  lng: saved || 'es-MX',
  fallbackLng: 'es-MX',
  interpolation: { escapeValue: false },
});

export default i18n;
