/** Diary feature: simple user notes (title optional, body required). */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS notes (
    id          TEXT PRIMARY KEY NOT NULL,
    user_id     TEXT NOT NULL,
    title       TEXT,
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','synced'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, updated_at)`,
];

export const migration002Notes = {
  version: 2,
  statements: STATEMENTS,
};
