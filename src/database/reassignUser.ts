import { exec, runInTransaction } from './sqlite/client';

const USER_SCOPED_TABLES = ['categories', 'transactions', 'udhaar_people', 'udhaar_entries'] as const;

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
