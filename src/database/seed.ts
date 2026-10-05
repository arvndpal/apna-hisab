import { v5 as uuidv5 } from 'uuid';
import { exec, runInTransaction } from './sqlite/client';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import { nowUtcIso } from '../utils/dates';
import { enqueue } from './repositories/syncQueueRepo';
import { schedule } from '../sync/syncEngine/engine';

// Fixed, arbitrary namespace for this app's deterministic category ids — must never change, or
// re-seeding would start minting different ids than before and the dedup this exists for breaks.
const CATEGORY_ID_NAMESPACE = '6f2f9c5e-7f2b-4b8a-9f0b-2f6e1f8a9c3d';

/**
 * Deterministic (not random) on purpose: this seeding runs again whenever local data is empty for
 * `userId` — e.g. after logout wipes it locally but the account's rows still exist on the server.
 * A random id would re-push each default as a brand-new row, duplicating it server-side and
 * colliding with the original on the (user_id, key) unique index the next time it's pulled back.
 * A stable id per (userId, key) makes a re-seed resolve to an upsert of the exact same row instead.
 * Must still be valid UUID syntax — Postgres's categories.id column is typed `uuid`, not `text`.
 */
function defaultCategoryId(userId: string, key: string): string {
  return uuidv5(`${userId}:${key}`, CATEGORY_ID_NAMESPACE);
}

/** Seeds the default income/expense categories for `userId` the first time it's seen. Idempotent. */
export function seedDefaultCategories(userId: string): void {
  const existing = exec('SELECT 1 FROM categories WHERE user_id = ? LIMIT 1', [userId]);
  if (existing.rows.length > 0) return;

  runInTransaction(() => {
    const now = nowUtcIso();
    for (const c of DEFAULT_CATEGORIES) {
      const id = defaultCategoryId(userId, c.key);
      exec(
        `INSERT INTO categories (id, user_id, key, type, name, name_hi, icon, sort, is_default, created_at, updated_at, deleted_at, sync_status)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 1, ?, ?, NULL, 'pending')`,
        [id, userId, c.key, c.type, c.nameHi, c.icon, c.sort, now, now],
      );
      enqueue('categories', id, 'upsert');
    }
  });
  schedule();
}
