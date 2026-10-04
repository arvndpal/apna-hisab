/** Wraps src/database/schema.sql (kept byte-for-byte identical) so it can run on-device. */
const SCHEMA_SQL = `
-- Apna Hisab local schema (expo-sqlite). Migration 001. Source of truth for the UI.
-- Money: INTEGER paise. IDs: UUID v4 text from device. Soft delete via deleted_at.
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id           TEXT PRIMARY KEY NOT NULL,
  user_id      TEXT NOT NULL,
  key          TEXT,                       -- default category key (see constants/categories.ts); NULL if user-created
  type         TEXT NOT NULL CHECK (type IN ('income','expense')),
  name         TEXT,                       -- user rename; NULL = use localized default
  name_hi      TEXT,
  icon         TEXT NOT NULL,
  sort         INTEGER NOT NULL DEFAULT 50,
  is_default   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT,
  sync_status  TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','synced'))
);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categories(user_id, type, sort);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_key ON categories(user_id, key) WHERE key IS NOT NULL;

CREATE TABLE IF NOT EXISTS transactions (
  id             TEXT PRIMARY KEY NOT NULL,
  user_id        TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount_paise   INTEGER NOT NULL CHECK (amount_paise > 0 AND amount_paise <= 1000000000),
  category_id    TEXT NOT NULL REFERENCES categories(id),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','upi','card','bank')),
  occurred_at    TEXT NOT NULL,            -- ISO with local offset
  occurred_on    TEXT NOT NULL,            -- local YYYY-MM-DD
  note           TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted_at     TEXT,
  sync_status    TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','synced'))
);
CREATE INDEX IF NOT EXISTS idx_tx_user_day ON transactions(user_id, occurred_on);
CREATE INDEX IF NOT EXISTS idx_tx_user_type_day ON transactions(user_id, type, occurred_on);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_tx_sync ON transactions(sync_status);

CREATE TABLE IF NOT EXISTS udhaar_people (
  id          TEXT PRIMARY KEY NOT NULL,
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','synced'))
);
CREATE INDEX IF NOT EXISTS idx_people_user ON udhaar_people(user_id);

CREATE TABLE IF NOT EXISTS udhaar_entries (
  id           TEXT PRIMARY KEY NOT NULL,
  user_id      TEXT NOT NULL,
  person_id    TEXT NOT NULL REFERENCES udhaar_people(id),
  direction    TEXT NOT NULL CHECK (direction IN ('given','received','took','paid')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0 AND amount_paise <= 1000000000),
  occurred_at  TEXT NOT NULL,
  occurred_on  TEXT NOT NULL,
  note         TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT,
  sync_status  TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','synced'))
);
CREATE INDEX IF NOT EXISTS idx_entries_person ON udhaar_entries(person_id, occurred_at);

CREATE TABLE IF NOT EXISTS sync_queue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name  TEXT NOT NULL,
  row_id      TEXT NOT NULL,
  op          TEXT NOT NULL CHECK (op IN ('upsert','delete')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_queue_created ON sync_queue(created_at);

CREATE TABLE IF NOT EXISTS sync_meta (
  table_name     TEXT PRIMARY KEY NOT NULL,
  last_pulled_at TEXT
);

CREATE TABLE IF NOT EXISTS kv_settings (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- Handy views (always exclude soft-deleted rows)
CREATE VIEW IF NOT EXISTS v_udhaar_balances AS
SELECT p.id AS person_id, p.user_id,
  COALESCE(SUM(CASE e.direction WHEN 'given' THEN e.amount_paise WHEN 'paid' THEN e.amount_paise
                                WHEN 'received' THEN -e.amount_paise WHEN 'took' THEN -e.amount_paise END), 0) AS balance_paise,
  COALESCE(SUM(CASE WHEN e.direction = 'given' THEN e.amount_paise END), 0)    AS given_paise,
  COALESCE(SUM(CASE WHEN e.direction = 'received' THEN e.amount_paise END), 0) AS received_paise,
  COALESCE(SUM(CASE WHEN e.direction = 'took' THEN e.amount_paise END), 0)     AS took_paise,
  COALESCE(SUM(CASE WHEN e.direction = 'paid' THEN e.amount_paise END), 0)     AS paid_paise,
  MAX(e.occurred_at) AS last_activity_at
FROM udhaar_people p
LEFT JOIN udhaar_entries e ON e.person_id = p.id AND e.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id;
`;

function splitStatements(sql: string): string[] {
  return sql
    .split('\n')
    .map((line) => {
      // Strip -- comments (whole-line or trailing); none of schema.sql's SQL contains a literal "--".
      const idx = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const migration001Init = {
  version: 1,
  statements: splitStatements(SCHEMA_SQL),
};
