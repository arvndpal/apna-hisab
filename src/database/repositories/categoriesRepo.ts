import { exec, runInTransaction } from '../sqlite/client';
import { newId } from '../../utils/ids';
import { nowUtcIso } from '../../utils/dates';
import { DEFAULT_CATEGORIES, OTHER_CATEGORY_KEY } from '../../constants/categories';
import { enqueue } from './syncQueueRepo';
import { schedule } from '../../sync/syncEngine/engine';
import type { Category, Language, TransactionType } from '../../types/models';

type CategoryRow = {
  id: string;
  user_id: string;
  key: string | null;
  type: TransactionType;
  name: string | null;
  name_hi: string | null;
  icon: string;
  sort: number;
  is_default: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: 'pending' | 'synced';
};

function fromRow(r: CategoryRow): Category {
  return {
    id: r.id,
    userId: r.user_id,
    key: r.key,
    type: r.type,
    name: r.name,
    nameHi: r.name_hi,
    icon: r.icon,
    sort: r.sort,
    isDefault: r.is_default === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    syncStatus: r.sync_status,
  };
}

/**
 * The label to show for a category. A rename is saved in the column matching the language it was
 * typed in (`name` for English, `name_hi` for Hindi — see `create`/`update`), so each language
 * carries its own independent rename.
 *
 * Defaults already carry a seeded `name_hi` (their built-in Hindi translation), so for them the
 * viewed language's own column — rename or seeded default — always wins outright; it must never
 * fall through to the other language's column, or the seeded Hindi text would leak into English
 * view (and vice versa for a Hindi rename) before the dictionary fallback is even consulted.
 * Only a custom category (no dictionary entry) falls back to whichever language's name does exist,
 * since otherwise an English-only custom name would show as blank in Hindi, and vice versa.
 */
export function categoryDisplayName(category: Category, language: Language): string {
  const own = language === 'hi' ? category.nameHi : category.name;
  const fallback = DEFAULT_CATEGORIES.find((c) => c.key === category.key);
  if (fallback) return own || (language === 'hi' ? fallback.nameHi : fallback.name);

  const other = language === 'hi' ? category.name : category.nameHi;
  return own || other || '';
}

export function list(userId: string, type?: TransactionType): Category[] {
  const sql = type
    ? 'SELECT * FROM categories WHERE user_id = ? AND type = ? AND deleted_at IS NULL ORDER BY sort, created_at'
    : 'SELECT * FROM categories WHERE user_id = ? AND deleted_at IS NULL ORDER BY sort, created_at';
  const params = type ? [userId, type] : [userId];
  return exec(sql, params).rows.map((r) => fromRow(r as unknown as CategoryRow));
}

export function getById(id: string): Category | null {
  const row = exec('SELECT * FROM categories WHERE id = ?', [id]).rows[0];
  return row ? fromRow(row as unknown as CategoryRow) : null;
}

/**
 * Names are unique per type, case-insensitive (SCREENS.md §11). A default category answers to its
 * English and Hindi names as well as any rename, so "food" or "खाना" clash with the seeded Food.
 */
export function findDuplicate(userId: string, type: TransactionType, name: string, excludeId?: string): Category | null {
  const wanted = name.trim().toLocaleLowerCase();
  if (!wanted) return null;
  return (
    list(userId, type).find((c) => {
      if (c.id === excludeId) return false;
      // Whatever would actually be shown for this category in either language — reusing
      // categoryDisplayName keeps this in sync with its own-rename-wins-over-dictionary rule.
      const names = [categoryDisplayName(c, 'en'), categoryDisplayName(c, 'hi')];
      return names.some((n) => n.trim().toLocaleLowerCase() === wanted);
    }) ?? null
  );
}

function getOtherCategoryId(userId: string, type: TransactionType): string | null {
  const row = exec('SELECT id FROM categories WHERE user_id = ? AND key = ? AND deleted_at IS NULL', [
    userId,
    OTHER_CATEGORY_KEY[type],
  ]).rows[0];
  return (row?.id as string | undefined) ?? null;
}

/** `language` picks which column the entered name is saved under — English into `name`, Hindi into `name_hi`. */
export function create(input: { userId: string; type: TransactionType; name: string; icon: string; language?: Language }): Category {
  const id = newId();
  const now = nowUtcIso();
  const maxSort = exec('SELECT MAX(sort) AS m FROM categories WHERE user_id = ? AND type = ?', [
    input.userId,
    input.type,
  ]).rows[0];
  const sort = Number((maxSort?.m as number | null) ?? 0) + 1;
  const isHindi = input.language === 'hi';

  exec(
    `INSERT INTO categories (id, user_id, key, type, name, name_hi, icon, sort, is_default, created_at, updated_at, deleted_at, sync_status)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 0, ?, ?, NULL, 'pending')`,
    [id, input.userId, input.type, isHindi ? null : input.name, isHindi ? input.name : null, input.icon, sort, now, now],
  );
  enqueue('categories', id, 'upsert');
  schedule();
  return getById(id)!;
}

/**
 * `language` picks which name column a given `patch.name` lands in, so each language keeps its own
 * independent rename (renaming while viewing Hindi never touches the English name, and vice versa).
 */
export function update(id: string, patch: { name?: string; icon?: string; language?: Language }): Category {
  const now = nowUtcIso();
  const current = getById(id);
  if (!current) throw new Error(`Category ${id} not found`);
  const isHindi = patch.language === 'hi';
  const nextName = patch.name === undefined ? current.name : isHindi ? current.name : patch.name;
  const nextNameHi = patch.name === undefined ? current.nameHi : isHindi ? patch.name : current.nameHi;

  exec('UPDATE categories SET name = ?, name_hi = ?, icon = ?, updated_at = ?, sync_status = ? WHERE id = ?', [
    nextName,
    nextNameHi,
    patch.icon ?? current.icon,
    now,
    'pending',
    id,
  ]);
  enqueue('categories', id, 'upsert');
  schedule();
  return getById(id)!;
}

/** Deleting keeps past transactions — they move to that type's "Other" category, per SCREENS.md §11. */
export function softDelete(id: string): void {
  const category = getById(id);
  if (!category || category.key === OTHER_CATEGORY_KEY[category.type]) return;
  const now = nowUtcIso();

  runInTransaction(() => {
    const otherId = getOtherCategoryId(category.userId, category.type);
    if (otherId) {
      const affected = exec('SELECT id FROM transactions WHERE category_id = ?', [id]).rows.map((r) => r.id as string);
      exec('UPDATE transactions SET category_id = ?, updated_at = ?, sync_status = ? WHERE category_id = ?', [
        otherId,
        now,
        'pending',
        id,
      ]);
      for (const txnId of affected) enqueue('transactions', txnId, 'upsert');
    }
    exec('UPDATE categories SET deleted_at = ?, updated_at = ?, sync_status = ? WHERE id = ?', [
      now,
      now,
      'pending',
      id,
    ]);
    enqueue('categories', id, 'upsert');
  });
  schedule();
}
