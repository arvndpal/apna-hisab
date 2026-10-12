import { describe, expect, it, vi } from 'vitest';
import { NotificationsService, reminderSlotForNow } from './notifications.service.js';
import { DatabaseService } from '../database/database.service.js';
import type { Messaging } from 'firebase-admin/messaging';

function makeDb(query: ReturnType<typeof vi.fn>): DatabaseService {
  return { query } as unknown as DatabaseService;
}

function makeMessaging(sendEachForMulticast: ReturnType<typeof vi.fn>): Messaging {
  return { sendEachForMulticast } as unknown as Messaging;
}

describe('reminderSlotForNow', () => {
  it('maps 09:00/15:00/21:00 IST (03:30/09:30/15:30 UTC) to morning/afternoon/evening', () => {
    expect(reminderSlotForNow(new Date('2026-01-15T03:30:00Z'))).toBe('morning');
    expect(reminderSlotForNow(new Date('2026-01-15T09:30:00Z'))).toBe('afternoon');
    expect(reminderSlotForNow(new Date('2026-01-15T15:30:00Z'))).toBe('evening');
  });

  it('returns null outside the three scheduled hours', () => {
    expect(reminderSlotForNow(new Date('2026-01-15T12:00:00Z'))).toBeNull();
  });
});

describe('NotificationsService.runReminderCheck', () => {
  it('only notifies users who have not yet logged a transaction today, in their own language', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        { id: 'user-en', language: 'en' },
        { id: 'user-hi', language: 'hi' },
      ])
      .mockResolvedValueOnce([{ token: 'tok-en' }])
      .mockResolvedValueOnce([{ token: 'tok-hi' }]);
    const sendEachForMulticast = vi.fn().mockResolvedValue({ successCount: 1, failureCount: 0, responses: [{ success: true }] });
    const service = new NotificationsService(makeDb(query), makeMessaging(sendEachForMulticast));

    const result = await service.runReminderCheck('morning');

    expect(result).toEqual({ usersNotified: 2 });
    expect(query.mock.calls[0][0]).toMatch(/NOT EXISTS/);
    expect(query.mock.calls[0][0]).toMatch(/is_blocked = false/);
    expect(sendEachForMulticast).toHaveBeenCalledTimes(2);
    expect(sendEachForMulticast.mock.calls[0][0].notification.body).toMatch(/Good morning/);
    expect(sendEachForMulticast.mock.calls[1][0].notification.body).toMatch(/सुप्रभात/);
  });

  it('is a no-op when everyone with a device has already logged today', async () => {
    const query = vi.fn().mockResolvedValueOnce([]);
    const sendEachForMulticast = vi.fn();
    const service = new NotificationsService(makeDb(query), makeMessaging(sendEachForMulticast));

    const result = await service.runReminderCheck('evening');

    expect(result).toEqual({ usersNotified: 0 });
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });
});
