import { exec } from '../sqlite/client';
import { newId } from '../../utils/ids';
import type { PaymentMethod, TransactionType } from '../../types/models';

const LOCAL_USER_ID_KEY = 'localUserId';
const LAST_PAYMENT_METHOD_KEY = 'lastPaymentMethod';
const lastCategoryKey = (type: TransactionType) => `lastCategory_${type}`;
const PROFILE_KEY = 'authProfile';
const LANGUAGE_KEY = 'language';
const LOCK_METHOD_KEY = 'lockMethod';
const LOCK_AFTER_MS_KEY = 'lockAfterMs';
const ONBOARDING_DONE_KEY = 'onboardingDone';
const LOCK_REMINDER_DISMISSED_KEY = 'lockReminderDismissed';
const NOTIFICATIONS_ENABLED_KEY = 'notificationsEnabled';
const REMINDER_TIME_KEY = 'reminderTime';
const LAST_SYNCED_AT_KEY = 'lastSyncedAt';

export function getSetting(key: string): string | null {
  const result = exec('SELECT value FROM kv_settings WHERE key = ?', [key]);
  return (result.rows[0]?.value as string | undefined) ?? null;
}

export function setSetting(key: string, value: string): void {
  exec('INSERT INTO kv_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    value,
  ]);
}

/**
 * Pre-auth device identity (CLAUDE.md Milestone 3: "No auth needed yet — use a local user id").
 * Generated once and persisted. Once signed in, reassignLocalDataToProfile (see
 * database/reassignUser.ts) re-scopes existing rows to the backend profile id and
 * getActiveUserId takes over as the id every query/write should use.
 */
export function getLocalUserId(): string {
  const existing = getSetting(LOCAL_USER_ID_KEY);
  if (existing) return existing;
  const id = newId();
  setSetting(LOCAL_USER_ID_KEY, id);
  return id;
}

/** The id every local query/write should scope to: the signed-in profile's id once signed in, else the local device id. */
export function getActiveUserId(): string {
  return getProfile()?.id ?? getLocalUserId();
}

/** Logout: drop the pre-auth device id too, so the next getLocalUserId() mints a fresh one. */
export function clearLocalUserId(): void {
  exec('DELETE FROM kv_settings WHERE key = ?', [LOCAL_USER_ID_KEY]);
}

/** Defaults for Add Transaction, per SCREENS.md §7–8: last used category/payment method. */
export function getLastCategoryId(type: TransactionType): string | null {
  return getSetting(lastCategoryKey(type));
}

export function setLastCategoryId(type: TransactionType, categoryId: string): void {
  setSetting(lastCategoryKey(type), categoryId);
}

export function getLastPaymentMethod(): PaymentMethod | null {
  return getSetting(LAST_PAYMENT_METHOD_KEY) as PaymentMethod | null;
}

export function setLastPaymentMethod(method: PaymentMethod): void {
  setSetting(LAST_PAYMENT_METHOD_KEY, method);
}

/**
 * Logout: these "last used" quick-defaults point at a specific categoryId, which wipeLocalData()
 * just deleted. Left alone, the next Add Transaction would silently prefill a category id that no
 * longer exists and fail with a foreign-key error on save.
 */
export function clearLastUsedDefaults(): void {
  exec('DELETE FROM kv_settings WHERE key IN (?, ?, ?)', [
    lastCategoryKey('income'),
    lastCategoryKey('expense'),
    LAST_PAYMENT_METHOD_KEY,
  ]);
}

export interface StoredProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

/** A locally persisted copy of the backend profile marks "signed in" without a network round trip. */
export function getProfile(): StoredProfile | null {
  const raw = getSetting(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as StoredProfile) : null;
}

export function setProfile(profile: StoredProfile): void {
  setSetting(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  setSetting(PROFILE_KEY, '');
}

export function getLanguage(): 'en' | 'hi' | null {
  const value = getSetting(LANGUAGE_KEY);
  return value === 'en' || value === 'hi' ? value : null;
}

export function setLanguage(language: 'en' | 'hi'): void {
  setSetting(LANGUAGE_KEY, language);
}

export type LockMethod = 'none' | 'pin' | 'biometric';

export function getLockMethod(): LockMethod {
  const value = getSetting(LOCK_METHOD_KEY);
  return value === 'pin' || value === 'biometric' ? value : 'none';
}

export function setLockMethod(method: LockMethod): void {
  setSetting(LOCK_METHOD_KEY, method);
}

/** Default 1 minute, per ARCHITECTURE §settings. */
export function getLockAfterMs(): number {
  const value = getSetting(LOCK_AFTER_MS_KEY);
  return value ? Number(value) : 60_000;
}

export function setLockAfterMs(ms: number): void {
  setSetting(LOCK_AFTER_MS_KEY, String(ms));
}

export function getOnboardingDone(): boolean {
  return getSetting(ONBOARDING_DONE_KEY) === 'true';
}

export function setOnboardingDone(done: boolean): void {
  setSetting(ONBOARDING_DONE_KEY, done ? 'true' : 'false');
}

export function getLockReminderDismissed(): boolean {
  return getSetting(LOCK_REMINDER_DISMISSED_KEY) === 'true';
}

export function setLockReminderDismissed(dismissed: boolean): void {
  setSetting(LOCK_REMINDER_DISMISSED_KEY, dismissed ? 'true' : 'false');
}

/** Daily reminder (SCREENS.md §19). Off until the user turns it on. */
export function getNotificationsEnabled(): boolean {
  return getSetting(NOTIFICATIONS_ENABLED_KEY) === 'true';
}

export function setNotificationsEnabled(enabled: boolean): void {
  setSetting(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
}

/** Local "HH:mm", default 21:00 ("9:00 PM"). */
export function getReminderTime(): string {
  const value = getSetting(REMINDER_TIME_KEY);
  return value && /^\d{2}:\d{2}$/.test(value) ? value : '21:00';
}

export function setReminderTime(hhmm: string): void {
  setSetting(REMINDER_TIME_KEY, hhmm);
}

/** Persisted so "Last synced …" survives an app restart instead of reading "Not synced yet". */
export function getLastSyncedAt(): string | null {
  return getSetting(LAST_SYNCED_AT_KEY) || null;
}

export function setLastSyncedAt(iso: string | null): void {
  setSetting(LAST_SYNCED_AT_KEY, iso ?? '');
}
