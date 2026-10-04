import { exec } from '../sqlite/client';
import { newId } from '../../utils/ids';
import type { PaymentMethod, TransactionType } from '../../types/models';

const LOCAL_USER_ID_KEY = 'localUserId';
const LAST_PAYMENT_METHOD_KEY = 'lastPaymentMethod';
const lastCategoryKey = (type: TransactionType) => `lastCategory_${type}`;

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
 * Generated once and persisted; Milestone 4 reassigns rows to the signed-in Supabase user id.
 */
export function getLocalUserId(): string {
  const existing = getSetting(LOCAL_USER_ID_KEY);
  if (existing) return existing;
  const id = newId();
  setSetting(LOCAL_USER_ID_KEY, id);
  return id;
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
