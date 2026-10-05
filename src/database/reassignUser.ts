import { exec, runInTransaction } from './sqlite/client';

const USER_SCOPED_TABLES = ['categories', 'transactions', 'udhaar_people', 'udhaar_entries'] as const;

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
    for (const table of USER_SCOPED_TABLES) {
      exec(`UPDATE ${table} SET user_id = ? WHERE user_id = ?`, [newUserId, oldUserId]);
    }
  });
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
