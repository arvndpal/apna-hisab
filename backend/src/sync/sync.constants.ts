/** The four tables that sync, matching src/database/schema.sql and supabase/migrations/0001_init.sql on the app side. */
export const SYNCED_TABLES = ['categories', 'transactions', 'udhaar_people', 'udhaar_entries'] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

export function isSyncedTable(value: string): value is SyncedTable {
  return (SYNCED_TABLES as readonly string[]).includes(value);
}

/**
 * Exact allowed columns per table (always includes 'id' and 'user_id'). Used to whitelist which
 * keys of a client-sent row are ever interpolated into SQL as column names when building the
 * push upsert — anything else sent by the client is silently dropped. user_id is in this list
 * only so the generic upsert can write it; sync.service.ts always overrides its *value* to the
 * authenticated caller's id before the row reaches here, never trusting what the client sent.
 */
export const TABLE_COLUMNS: Record<SyncedTable, readonly string[]> = {
  categories: ['id', 'user_id', 'key', 'type', 'name', 'name_hi', 'icon', 'sort', 'is_default', 'created_at', 'updated_at', 'deleted_at'],
  transactions: [
    'id',
    'user_id',
    'type',
    'amount_paise',
    'category_id',
    'payment_method',
    'occurred_at',
    'occurred_on',
    'note',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  udhaar_people: ['id', 'user_id', 'name', 'phone', 'created_at', 'updated_at', 'deleted_at'],
  udhaar_entries: [
    'id',
    'user_id',
    'person_id',
    'direction',
    'amount_paise',
    'occurred_at',
    'occurred_on',
    'note',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
};
