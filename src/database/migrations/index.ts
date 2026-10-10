import { exec, runInTransaction } from '../sqlite/client';
import { migration001Init } from './001_init';
import { migration002Notes } from './002_notes';
import { migration003CategoryAliases } from './003_category_aliases';
import { migration004NoteColor } from './004_note_color';

const MIGRATIONS = [migration001Init, migration002Notes, migration003CategoryAliases, migration004NoteColor];

function getUserVersion(): number {
  const result = exec('PRAGMA user_version');
  return Number(result.rows[0]?.user_version ?? 0);
}

const CONNECTION_PRAGMA = /^pragma\s+(journal_mode|foreign_keys)\b/i;

/** Runs pending migrations in order, each inside its own transaction, bumping PRAGMA user_version. */
export function migrate(): void {
  // journal_mode/foreign_keys are per-connection settings SQLite refuses to change inside a
  // transaction (e.g. "cannot change into wal mode from within a transaction") — apply them once
  // up front, then run the rest of each migration's statements transactionally as usual.
  exec('PRAGMA journal_mode = WAL');
  exec('PRAGMA foreign_keys = ON');

  const current = getUserVersion();
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    runInTransaction(() => {
      for (const statement of migration.statements) {
        if (CONNECTION_PRAGMA.test(statement)) continue;
        exec(statement);
      }
      exec(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
