import { __setTestDriver } from '../sqlite/client';
import { createTestDriver } from '../sqlite/testDriver';
import { migrate } from '../migrations';
import * as syncQueueRepo from './syncQueueRepo';

beforeEach(() => {
  __setTestDriver(createTestDriver());
  migrate();
});

afterAll(() => {
  __setTestDriver(null);
});

describe('syncQueueRepo', () => {
  it('enqueues and lists oldest first', () => {
    syncQueueRepo.enqueue('transactions', 'a', 'upsert');
    syncQueueRepo.enqueue('transactions', 'b', 'upsert');
    const batch = syncQueueRepo.listBatch();
    expect(batch.map((q) => q.rowId)).toEqual(['a', 'b']);
    expect(syncQueueRepo.count()).toBe(2);
  });

  it('remove() clears a row after a successful push', () => {
    syncQueueRepo.enqueue('transactions', 'a', 'upsert');
    const [item] = syncQueueRepo.listBatch();
    syncQueueRepo.remove(item.id);
    expect(syncQueueRepo.count()).toBe(0);
  });

  it('recordFailure() increments attempts and stores the error', () => {
    syncQueueRepo.enqueue('transactions', 'a', 'upsert');
    const [item] = syncQueueRepo.listBatch();
    syncQueueRepo.recordFailure(item.id, 'network error');
    const [updated] = syncQueueRepo.listBatch();
    expect(updated.attempts).toBe(1);
    expect(updated.lastError).toBe('network error');
  });
});
