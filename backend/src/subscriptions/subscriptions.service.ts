import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';
import type { Env } from '../config/env.validation.js';

type Plan = 'trial' | 'monthly' | 'yearly';

interface SubscriptionRow {
  plan: Plan;
  source: 'trial' | 'play';
  play_product_id: string | null;
  ends_at: string;
}

export interface SubscriptionStatus {
  /** null until the user has either claimed the trial or bought a plan. */
  plan: Plan | null;
  isPremium: boolean;
  endsAt: string | null;
  productId: string | null;
  /** How long the free trial is right now (config-driven — see TRIAL_DAYS), for the claim offer's copy. */
  trialDays: number;
}

const PLAN_LENGTH_SQL: Record<'monthly' | 'yearly', string> = {
  monthly: "interval '1 month'",
  yearly: "interval '1 year'",
};

@Injectable()
export class SubscriptionsService {
  private readonly trialDays: number;

  constructor(
    private readonly db: DatabaseService,
    config: ConfigService<Env, true>,
  ) {
    this.trialDays = config.get('TRIAL_DAYS', { infer: true });
  }

  private toStatus(row: SubscriptionRow | undefined): SubscriptionStatus {
    if (!row) return { plan: null, isPremium: false, endsAt: null, productId: null, trialDays: this.trialDays };
    return {
      plan: row.plan,
      isPremium: new Date(row.ends_at) > new Date(),
      endsAt: row.ends_at,
      productId: row.play_product_id,
      trialDays: this.trialDays,
    };
  }

  /**
   * The current (or most recent) subscription row for this user, if any — `plan: null` means they
   * haven't claimed the trial or bought a plan yet. Whether a row is still *active* is judged by
   * `ends_at` against the current time, not re-checked any other way, so a trial nobody comes back
   * to just quietly expires.
   */
  async getStatus(userId: string): Promise<SubscriptionStatus> {
    const rows = await this.db.query<SubscriptionRow>(
      `SELECT plan, source, play_product_id, ends_at FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    return this.toStatus(rows[0]);
  }

  /**
   * Starts the free trial — only once per account, and only when explicitly claimed (the login
   * flow's claim-trial step, or the Premium screen). Claiming again (e.g. a retried request) is a
   * harmless no-op: it returns whatever this account already has instead of resetting the clock.
   */
  async claimTrial(userId: string): Promise<SubscriptionStatus> {
    const existing = await this.db.query<SubscriptionRow>(
      `SELECT plan, source, play_product_id, ends_at FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    if (existing[0]) return this.toStatus(existing[0]);

    const inserted = await this.db.query<SubscriptionRow>(
      `INSERT INTO subscriptions (user_id, plan, status, source, started_at, ends_at)
       VALUES ($1, 'trial', 'active', 'trial', now(), now() + ($2 || ' days')::interval)
       RETURNING plan, source, play_product_id, ends_at`,
      [userId, this.trialDays],
    );
    return this.toStatus(inserted[0]);
  }

  /**
   * Records whatever plan the app's own purchase flow (currently a mock payment — see
   * PremiumScreen's handleConfirmPayment, docs/ARCHITECTURE.md §12) just confirmed. No Play receipt
   * is verified here; this persists the outcome the UI already showed the user, so it survives a
   * reinstall and isn't lost the way the local-only entitlement cache would be.
   */
  async recordPurchase(userId: string, plan: 'monthly' | 'yearly', productId: string): Promise<SubscriptionStatus> {
    return this.db.transaction(async (query) => {
      await query(`UPDATE subscriptions SET status = 'cancelled', updated_at = now() WHERE user_id = $1 AND status = 'active'`, [
        userId,
      ]);
      const inserted = await query<SubscriptionRow>(
        `INSERT INTO subscriptions (user_id, plan, status, source, play_product_id, started_at, ends_at)
         VALUES ($1, $2, 'active', 'play', $3, now(), now() + ${PLAN_LENGTH_SQL[plan]})
         RETURNING plan, source, play_product_id, ends_at`,
        [userId, plan, productId],
      );
      return this.toStatus(inserted[0]);
    });
  }
}
