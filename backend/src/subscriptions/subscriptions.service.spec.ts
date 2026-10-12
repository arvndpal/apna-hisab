import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from './subscriptions.service.js';
import { DatabaseService } from '../database/database.service.js';

function makeDb(query: ReturnType<typeof vi.fn>): DatabaseService {
  return { query, transaction: async (fn: (q: typeof query) => unknown) => fn(query) } as unknown as DatabaseService;
}

function makeConfig(trialDays = 30): ConfigService {
  return { get: () => trialDays } as unknown as ConfigService;
}

const future = new Date(Date.now() + 10_000).toISOString();
const past = new Date(Date.now() - 10_000).toISOString();

describe('SubscriptionsService.getStatus', () => {
  it('reports plan: null and no Premium for a user who has never claimed a trial or bought a plan', async () => {
    const query = vi.fn().mockResolvedValueOnce([]);
    const service = new SubscriptionsService(makeDb(query), makeConfig(30));

    const status = await service.getStatus('user-1');

    expect(status).toEqual({ plan: null, isPremium: false, endsAt: null, productId: null, trialDays: 30 });
    expect(query).toHaveBeenCalledTimes(1); // never auto-inserts
  });

  it('reports isPremium false once ends_at is in the past', async () => {
    const query = vi.fn().mockResolvedValueOnce([{ plan: 'trial', source: 'trial', play_product_id: null, ends_at: past }]);
    const service = new SubscriptionsService(makeDb(query), makeConfig());

    const status = await service.getStatus('user-1');

    expect(status.isPremium).toBe(false);
  });
});

describe('SubscriptionsService.claimTrial', () => {
  it('starts a trial of the configured length for a user who never had one', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([]) // no existing row
      .mockResolvedValueOnce([{ plan: 'trial', source: 'trial', play_product_id: null, ends_at: future }]);
    const service = new SubscriptionsService(makeDb(query), makeConfig(15));

    const status = await service.claimTrial('user-1');

    expect(status).toEqual({ plan: 'trial', isPremium: true, endsAt: future, productId: null, trialDays: 15 });
    expect(query.mock.calls[1][0]).toMatch(/INSERT INTO subscriptions/);
    expect(query.mock.calls[1][1]).toEqual(['user-1', 15]);
  });

  it('is a no-op that returns the existing row for a user who already claimed one', async () => {
    const query = vi.fn().mockResolvedValueOnce([{ plan: 'trial', source: 'trial', play_product_id: null, ends_at: future }]);
    const service = new SubscriptionsService(makeDb(query), makeConfig());

    const status = await service.claimTrial('user-1');

    expect(status.plan).toBe('trial');
    expect(query).toHaveBeenCalledTimes(1); // never inserts a second row
  });
});

describe('SubscriptionsService.recordPurchase', () => {
  it('supersedes any active row and inserts the purchased plan', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(undefined) // the UPDATE ... cancelled
      .mockResolvedValueOnce([{ plan: 'yearly', source: 'play', play_product_id: 'premium_yearly', ends_at: future }]);
    const service = new SubscriptionsService(makeDb(query), makeConfig());

    const status = await service.recordPurchase('user-1', 'yearly', 'premium_yearly');

    expect(status).toEqual({ plan: 'yearly', isPremium: true, endsAt: future, productId: 'premium_yearly', trialDays: 30 });
    expect(query.mock.calls[0][0]).toMatch(/UPDATE subscriptions SET status = 'cancelled'/);
    expect(query.mock.calls[1][0]).toMatch(/'1 year'/);
  });
});
