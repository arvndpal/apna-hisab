/**
 * Recovers transactions the pull used to drop. A cloud transaction pointing at a stale duplicate of
 * a default category (same key, older id — see reassignUser.ts) failed the local foreign key and was
 * skipped, while the pull cursor moved past it, so it never came back. The engine now re-points
 * such rows (category_aliases remembers which cloud id maps to which local category); resetting the
 * category/transaction cursors makes the next sync re-pull everything once and pick the lost rows up.
 * Local pending edits are untouched by a re-pull (last-write-wins keeps them).
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS category_aliases (
    alias_id    TEXT PRIMARY KEY NOT NULL,
    category_id TEXT NOT NULL
  )`,
  `DELETE FROM sync_meta WHERE table_name IN ('categories', 'transactions')`,
];

export const migration003CategoryAliases = {
  version: 3,
  statements: STATEMENTS,
};
