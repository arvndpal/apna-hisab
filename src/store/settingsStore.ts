import { create } from 'zustand';
import i18n, { detectDeviceLanguage } from '../i18n';
import * as settingsRepo from '../database/repositories/settingsRepo';
import type { Language } from '../types/models';
import type { LockMethod } from '../database/repositories/settingsRepo';

interface SettingsState {
  language: Language;
  lockMethod: LockMethod;
  lockAfterMs: number;
  onboardingDone: boolean;
  notificationsEnabled: boolean;
  /** Local "HH:mm". */
  reminderTime: string;
  hydrated: boolean;
  setLanguage: (language: Language) => void;
  setLockMethod: (method: LockMethod) => void;
  setLockAfterMs: (ms: number) => void;
  setOnboardingDone: (done: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderTime: (hhmm: string) => void;
  /** Reads persisted settings from SQLite. Must only run after migrate() — see SplashScreen. */
  hydrate: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: detectDeviceLanguage(),
  lockMethod: 'none',
  lockAfterMs: 60_000,
  onboardingDone: false,
  notificationsEnabled: false,
  reminderTime: '21:00',
  hydrated: false,
  setLanguage: (language) => {
    i18n.changeLanguage(language);
    settingsRepo.setLanguage(language);
    set({ language });
  },
  setLockMethod: (lockMethod) => {
    settingsRepo.setLockMethod(lockMethod);
    set({ lockMethod });
  },
  setLockAfterMs: (lockAfterMs) => {
    settingsRepo.setLockAfterMs(lockAfterMs);
    set({ lockAfterMs });
  },
  setOnboardingDone: (onboardingDone) => {
    settingsRepo.setOnboardingDone(onboardingDone);
    set({ onboardingDone });
  },
  setNotificationsEnabled: (notificationsEnabled) => {
    settingsRepo.setNotificationsEnabled(notificationsEnabled);
    set({ notificationsEnabled });
  },
  setReminderTime: (reminderTime) => {
    settingsRepo.setReminderTime(reminderTime);
    set({ reminderTime });
  },
  hydrate: () => {
    const storedLanguage = settingsRepo.getLanguage();
    const language = storedLanguage ?? detectDeviceLanguage();
    i18n.changeLanguage(language);
    set({
      language,
      lockMethod: settingsRepo.getLockMethod(),
      lockAfterMs: settingsRepo.getLockAfterMs(),
      onboardingDone: settingsRepo.getOnboardingDone(),
      notificationsEnabled: settingsRepo.getNotificationsEnabled(),
      reminderTime: settingsRepo.getReminderTime(),
      hydrated: true,
    });
  },
}));
