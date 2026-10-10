/** Domain types. All money is integer paise. All ids are UUID v4 generated on device. */

export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank';
export type SyncStatusValue = 'pending' | 'synced';
export type Language = 'en' | 'hi';

interface Syncable {
  id: string;
  userId: string;
  createdAt: string; // UTC ISO
  updatedAt: string; // UTC ISO — conflict resolution key (last write wins)
  deletedAt: string | null; // soft delete
  syncStatus: SyncStatusValue;
}

export interface Transaction extends Syncable {
  type: TransactionType;
  amountPaise: number;
  categoryId: string;
  paymentMethod: PaymentMethod;
  occurredAt: string; // ISO with local offset, e.g. 2026-10-03T09:05:00+05:30
  occurredOn: string; // local YYYY-MM-DD (grouping / calendar)
  note: string | null;
}

export interface Category extends Syncable {
  key: string | null; // default category key; null for user-created
  type: TransactionType;
  name: string | null; // user rename; null → use localized default
  nameHi: string | null;
  icon: string;
  sort: number;
  isDefault: boolean;
}

export type UdhaarDirection = 'given' | 'received' | 'took' | 'paid';

export interface UdhaarPerson extends Syncable {
  name: string;
  phone: string | null;
}

export interface Note extends Syncable {
  title: string | null;
  body: string;
  color: string | null; // hex, e.g. "#FDE68A" — card background; null = default surface
}

export interface UdhaarEntry extends Syncable {
  personId: string;
  direction: UdhaarDirection;
  amountPaise: number;
  occurredAt: string;
  occurredOn: string;
  note: string | null;
}

/** balance > 0 → you will receive; < 0 → you need to pay; 0 → settled */
export interface UdhaarPersonWithBalance extends UdhaarPerson {
  balancePaise: number;
  givenPaise: number;
  receivedPaise: number;
  tookPaise: number;
  paidPaise: number;
  lastEntry: Pick<UdhaarEntry, 'direction' | 'amountPaise' | 'occurredOn'> | null;
}

export interface Summary {
  incomePaise: number;
  expensePaise: number;
  netPaise: number; // income − expense (Udhaar never included)
}

export type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | '6m' | 'year' | 'custom';

export interface DateRange {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

export interface CategoryBreakdownRow {
  categoryId: string;
  amountPaise: number;
  count: number;
  share: number; // 0–1
}

export interface PaymentMethodBreakdownRow {
  paymentMethod: PaymentMethod;
  amountPaise: number;
  count: number;
  share: number; // 0–1
}

export type SyncUiStatus = 'synced' | 'pending' | 'syncing' | 'offline' | 'error';

export interface SyncQueueItem {
  id: number;
  tableName: 'transactions' | 'categories' | 'udhaar_people' | 'udhaar_entries' | 'notes';
  rowId: string;
  op: 'upsert' | 'delete';
  attempts: number;
  lastError: string | null;
  createdAt: string;
}
