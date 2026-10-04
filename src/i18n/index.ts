import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import en from './en.json';
import hi from './hi.json';
import type { Language } from '../types/models';

const resources = { en: { translation: en }, hi: { translation: hi } };

function detectDeviceLanguage(): Language {
  const best = RNLocalize.findBestLanguageTag(['en', 'hi']);
  return best?.languageTag === 'hi' ? 'hi' : 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { detectDeviceLanguage };
export default i18n;
