import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Messaging } from 'firebase-admin/messaging';
import { DatabaseService } from '../database/database.service.js';
import { FIREBASE_MESSAGING } from './firebase-messaging.provider.js';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface SendResult {
  sent: number;
  failed: number;
}

/** FCM's per-call limit on sendEachForMulticast. */
const MULTICAST_BATCH_SIZE = 500;

const REENGAGEMENT_COPY: Record<'en' | 'hi', { title: string; body: string }> = {
  en: { title: 'Apna Hisab', body: "You haven't logged anything in a few days — tap to add today's entries." },
  hi: { title: 'अपना हिसाब', body: 'कुछ दिनों से कोई एंट्री नहीं — आज का हिसाब लिखने के लिए टैप करें।' },
};

function isUnregistered(code: string | undefined): boolean {
  return code === 'messaging/registration-token-not-registered';
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(FIREBASE_MESSAGING) private readonly messaging: Messaging,
  ) {}

  async registerToken(userId: string, token: string, platform: 'android' | 'ios'): Promise<void> {
    await this.db.query(
      `INSERT INTO device_tokens (user_id, token, platform, last_seen_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, last_seen_at = now()`,
      [userId, token, platform],
    );
  }

  async deleteToken(userId: string, token: string): Promise<void> {
    await this.db.query('DELETE FROM device_tokens WHERE user_id = $1 AND token = $2', [userId, token]);
  }

  /** Sends to a batch of raw tokens, pruning any FCM reports as permanently dead. Shared by every send path. */
  private async sendToTokens(tokens: string[], payload: PushPayload): Promise<SendResult> {
    if (tokens.length === 0) return { sent: 0, failed: 0 };
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < tokens.length; i += MULTICAST_BATCH_SIZE) {
      const batch = tokens.slice(i, i + MULTICAST_BATCH_SIZE);
      const result = await this.messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
      });
      sent += result.successCount;
      failed += result.failureCount;

      const deadTokens = result.responses
        .map((r, idx) => (!r.success && isUnregistered(r.error?.code) ? batch[idx] : null))
        .filter((t): t is string => t !== null);
      if (deadTokens.length > 0) {
        await this.db.query('DELETE FROM device_tokens WHERE token = ANY($1)', [deadTokens]);
      }
    }
    if (failed > 0) this.logger.warn(`Push send: ${sent} ok, ${failed} failed`);
    return { sent, failed };
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<SendResult> {
    const rows = await this.db.query<{ token: string }>('SELECT token FROM device_tokens WHERE user_id = $1', [userId]);
    return this.sendToTokens(
      rows.map((r) => r.token),
      payload,
    );
  }

  /** Used by the admin send screen's "specific users" target (one or more). */
  async sendToUsers(userIds: string[], payload: PushPayload): Promise<SendResult> {
    const rows = await this.db.query<{ token: string }>('SELECT token FROM device_tokens WHERE user_id = ANY($1)', [userIds]);
    return this.sendToTokens(
      rows.map((r) => r.token),
      payload,
    );
  }

  /** Broadcasts to every registered device. Used only by the admin send screen. */
  async sendToAll(payload: PushPayload): Promise<SendResult> {
    const rows = await this.db.query<{ token: string }>('SELECT token FROM device_tokens');
    return this.sendToTokens(
      rows.map((r) => r.token),
      payload,
    );
  }

  async countAllDevices(): Promise<number> {
    const rows = await this.db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM device_tokens');
    return Number(rows[0]?.count ?? 0);
  }

  /** Powers the admin screen's "specific user" search-as-you-type picker. */
  async searchUsers(query: string): Promise<{ id: string; name: string | null; email: string | null }[]> {
    return this.db.query(
      `SELECT id, name, email FROM profiles WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY name NULLS LAST LIMIT 20`,
      [`%${query}%`],
    );
  }

  /**
   * Re-engagement push: users with a registered device who haven't logged (or edited) a
   * transaction in `inactivityDays`. Localizes copy from each profile's own language setting.
   */
  async runDailyCheck(inactivityDays = 3): Promise<{ usersNotified: number }> {
    const rows = await this.db.query<{ id: string; language: 'en' | 'hi' }>(
      `SELECT DISTINCT p.id, p.language
       FROM profiles p
       JOIN device_tokens dt ON dt.user_id = p.id
       WHERE NOT EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.user_id = p.id AND t.deleted_at IS NULL AND t.updated_at > now() - ($1 || ' days')::interval
       )`,
      [inactivityDays],
    );
    for (const row of rows) {
      const copy = REENGAGEMENT_COPY[row.language];
      await this.sendToUser(row.id, { title: copy.title, body: copy.body, data: { type: 'reengagement' } });
    }
    return { usersNotified: rows.length };
  }
}
