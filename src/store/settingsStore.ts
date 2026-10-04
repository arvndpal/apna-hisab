import { create } from 'zustand';
import i18n, { detectDeviceLanguage } from '../i18n';
import type { Language } from '../types/models';

interface SettingsState {
  language: Language;
  setLanguage: (language: Language) => void;
}

/** In-memory for now — persisted to kv_settings once the SQLite layer lands (Milestone 2). */
export const useSettingsStore = create<SettingsState>((set) => ({
  language: detectDeviceLanguage(),
  setLanguage: (language) => {
    i18n.changeLanguage(language);
    set({ language });
  },
}));
