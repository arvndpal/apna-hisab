import { exec, runInTransaction } from './sqlite/client';
import { defaultCategoryId } from './seed';
import { enqueue } from './repositories/syncQueueRepo';
import { nowUtcIso } from '../utils/dates';

// Categories are handled separately by remapDefaultCategoryIds below — a plain user_id move would
// collide with the fresh rows it inserts (same (user_id, key) the unique index is keyed on).
const USER_SCOPED_TABLES = ['transactions', 'udhaar_people', 'udhaar_entries'] as const;

// Children before parents — transactions.category_id and udhaar_entries.person_id are FK
// references, so deleting a category/person while its rows still exist violates the constraint.
const DELETE_ORDER = ['transactions', 'udhaar_entries', 'categories', 'udhaar_people'] as const;

/**
 * Re-scopes every local row from the pre-auth local device id to the real signed-in profile id,
 * so existing local data (and the UI's active-user-scoped queries) keep working after sign-in.
 * A no-op once already reassigned (oldUserId stops matching any row). Safe to call every sign-in.
 */
export function reassignLocalDataToProfile(oldUserId: string, newUserId: string): void {
  if (oldUserId === newUserId) return;
  runInTransaction(() => {
    remapDefaultCategoryIds(oldUserId, newUserId);
    // Default categories are fully handled above; a custom category (no key, so no id scheme to
    // reconcile) just needs the same plain move everything else gets.
    exec('UPDATE categories SET user_id = ? WHERE user_id = ? AND key IS NULL', [newUserId, oldUserId]);
    for (const table of USER_SCOPED_TABLES) {
      exec(`UPDATE ${table} SET user_id = ? WHERE user_id = ?`, [newUserId, oldUserId]);
    }
  });
}

/**
 * Default categories get a deterministic id — uuidv5(userId:key) — so the same logical category
 * resolves to the same row everywhere for a given signed-in user (see seed.ts). But that id is
 * computed from whatever `userId` was active *at seed time*, which for data seeded before sign-in
 * is the ephemeral pre-auth local device id, not the real profile id. Reassigning only the
 * `user_id` column (as this function used to) left those rows keyed to a value tied to one
 * specific device's pre-auth session — every fresh install mints a new local id and therefore a
 * fresh set of "duplicate" category rows with the same key but a different id, none of which match
 * what re-seeding under the real profile id would produce. Synced to the cloud, these accumulate
 * as orphaned duplicates, and any transaction still pointing at an older one silently fails to
 * pull on a new device, since its category_id never resolves to a row that device created.
 *
 * This repoints every default category (and anything referencing it) to the id that seeding would
 * have produced under `newUserId` in the first place, so re-signing in — on this device or any
 * other — always converges on the one canonical row per key instead of growing more duplicates.
 */
function remapDefaultCategoryIds(oldUserId: string, newUserId: string): void {
  const defaults = exec('SELECT id, key FROM categories WHERE user_id = ? AND key IS NOT NULL', [oldUserId])
    .rows as Array<{ id: string; key: string }>;

  for (const cat of defaults) {
    const properId = defaultCategoryId(newUserId, cat.key);
    if (properId === cat.id) continue;

    const alreadyExists = exec('SELECT 1 FROM categories WHERE id = ?', [properId]).rows.length > 0;
    if (!alreadyExists) {
      // Copy the row to its correctly-scoped id first — a child (transaction) can then be
      // repointed to a parent that already exists, keeping every statement FK-valid throughout
      // (renaming the old row's id in place would momentarily orphan anything still referencing it).
      exec(
        `INSERT INTO categories (id, user_id, key, type, name, name_hi, icon, sort, is_default, created_at, updated_at, deleted_at, sync_status)
         SELECT ?, ?, key, type, name, name_hi, icon, sort, is_default, created_at, updated_at, deleted_at, 'pending' FROM categories WHERE id = ?`,
        [properId, newUserId, cat.id],
      );
      enqueue('categories', properId, 'upsert');
    }

    const affectedTxns = exec('SELECT id FROM transactions WHERE category_id = ?', [cat.id]).rows.map((r) => r.id as string);
    if (affectedTxns.length > 0) {
      exec("UPDATE transactions SET category_id = ?, sync_status = 'pending' WHERE category_id = ?", [properId, cat.id]);
      for (const txnId of affectedTxns) enqueue('transactions', txnId, 'upsert');
    }

    // Soft-delete rather than hard-delete the stale row so the next push tombstones it in the
    // cloud too, instead of leaving it to linger there as yet another orphaned duplicate.
    const now = nowUtcIso();
    exec("UPDATE categories SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?", [now, now, cat.id]);
    enqueue('categories', cat.id, 'upsert');
  }
}

/**
 * Logout (MoreScreen, SCREENS.md §18): "logout clears local DB after confirm". Hard-deletes this
 * user's rows rather than soft-deleting — there is no sync queue left to carry a tombstone once
 * the session ends, and leaving the data sitting in local SQLite after an explicit sign-out would
 * be a privacy gap on a shared device.
 */
export function wipeLocalData(userId: string): void {
  runInTransaction(() => {
    for (const table of DELETE_ORDER) {
      exec(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
    }
    exec('DELETE FROM sync_queue');
    exec('DELETE FROM sync_meta');
  });
}
