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

export type ReminderSlot = 'morning' | 'afternoon' | 'evening';

const DAILY_REMINDER_COPY: Record<ReminderSlot, Record<'en' | 'hi', { title: string; body: string }>> = {
  morning: {
    en: { title: 'Apna Hisab', body: "Good morning! Add today's income and expenses before you forget." },
    hi: { title: 'अपना हिसाब', body: 'सुप्रभात! आज की आय और खर्च अभी जोड़ लें, भूलने से पहले।' },
  },
  afternoon: {
    en: { title: 'Apna Hisab', body: "Quick reminder — log today's income and expenses." },
    hi: { title: 'अपना हिसाब', body: 'याद दिलाना चाहते हैं — आज की आय और खर्च दर्ज करें।' },
  },
  evening: {
    en: { title: 'Apna Hisab', body: "Before the day ends, add today's income and expenses." },
    hi: { title: 'अपना हिसाब', body: 'दिन खत्म होने से पहले, आज की आय और खर्च जोड़ लें।' },
  },
};

function isUnregistered(code: string | undefined): boolean {
  return code === 'messaging/registration-token-not-registered';
}

/**
 * Single Vercel Cron job fires at 03:30/09:30/15:30 UTC (09:00/15:00/21:00 IST — the half-hour UTC
 * offset cancels IST's own +5:30), so the slot is derived from the current IST hour rather than
 * needing three separate scheduled jobs (which would eat into Vercel's per-project cron job cap).
 */
export function reminderSlotForNow(now = new Date()): ReminderSlot | null {
  const istHour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(now));
  if (istHour === 9) return 'morning';
  if (istHour === 15) return 'afternoon';
  if (istHour === 21) return 'evening';
  return null;
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

  /**
   * Daily reminder (3x/day — see reminderSlotForNow): every non-blocked user with a registered
   * device who hasn't logged a transaction yet *today* (IST). Unlike runDailyCheck's multi-day
   * inactivity check, this resets every day — someone who already logged today isn't pinged again
   * at the next slot.
   */
  async runReminderCheck(slot: ReminderSlot): Promise<{ usersNotified: number }> {
    const rows = await this.db.query<{ id: string; language: 'en' | 'hi' }>(
      `SELECT DISTINCT p.id, p.language
       FROM profiles p
       JOIN device_tokens dt ON dt.user_id = p.id
       WHERE p.is_blocked = false
         AND NOT EXISTS (
           SELECT 1 FROM transactions t
           WHERE t.user_id = p.id AND t.deleted_at IS NULL
             AND t.occurred_on = (now() AT TIME ZONE 'Asia/Kolkata')::date
         )`,
    );
    for (const row of rows) {
      const copy = DAILY_REMINDER_COPY[slot][row.language];
      await this.sendToUser(row.id, { title: copy.title, body: copy.body, data: { type: 'daily-reminder' } });
    }
    return { usersNotified: rows.length };
  }
}
