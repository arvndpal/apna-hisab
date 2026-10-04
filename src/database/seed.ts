import { exec, runInTransaction } from './sqlite/client';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import { newId } from '../utils/ids';
import { nowUtcIso } from '../utils/dates';

/** Seeds the default income/expense categories for `userId` the first time it's seen. Idempotent. */
export function seedDefaultCategories(userId: string): void {
  const existing = exec('SELECT 1 FROM categories WHERE user_id = ? LIMIT 1', [userId]);
  if (existing.rows.length > 0) return;

  runInTransaction(() => {
    const now = nowUtcIso();
    for (const c of DEFAULT_CATEGORIES) {
      exec(
        `INSERT INTO categories (id, user_id, key, type, name, name_hi, icon, sort, is_default, created_at, updated_at, deleted_at, sync_status)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 1, ?, ?, NULL, 'pending')`,
        [newId(), userId, c.key, c.type, c.nameHi, c.icon, c.sort, now, now],
      );
    }
  });
}
