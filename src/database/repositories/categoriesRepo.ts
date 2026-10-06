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

/** The label to show for a category, honouring a user rename over the localized default. */
export function categoryDisplayName(category: Category, language: Language): string {
  if (category.name) return category.name;
  if (language === 'hi' && category.nameHi) return category.nameHi;
  const fallback = DEFAULT_CATEGORIES.find((c) => c.key === category.key);
  return fallback ? (language === 'hi' ? fallback.nameHi : fallback.name) : (category.nameHi ?? '');
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
      const fallback = DEFAULT_CATEGORIES.find((d) => d.key === c.key);
      const names = c.name ? [c.name] : [c.nameHi, fallback?.name, fallback?.nameHi];
      return names.some((n) => n?.trim().toLocaleLowerCase() === wanted);
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

export function create(input: { userId: string; type: TransactionType; name: string; icon: string }): Category {
  const id = newId();
  const now = nowUtcIso();
  const maxSort = exec('SELECT MAX(sort) AS m FROM categories WHERE user_id = ? AND type = ?', [
    input.userId,
    input.type,
  ]).rows[0];
  const sort = Number((maxSort?.m as number | null) ?? 0) + 1;

  exec(
    `INSERT INTO categories (id, user_id, key, type, name, name_hi, icon, sort, is_default, created_at, updated_at, deleted_at, sync_status)
     VALUES (?, ?, NULL, ?, ?, NULL, ?, ?, 0, ?, ?, NULL, 'pending')`,
    [id, input.userId, input.type, input.name, input.icon, sort, now, now],
  );
  enqueue('categories', id, 'upsert');
  schedule();
  return getById(id)!;
}

export function update(id: string, patch: { name?: string; icon?: string }): Category {
  const now = nowUtcIso();
  const current = getById(id);
  if (!current) throw new Error(`Category ${id} not found`);
  exec('UPDATE categories SET name = ?, icon = ?, updated_at = ?, sync_status = ? WHERE id = ?', [
    patch.name ?? current.name,
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
