import { __setTestDriver, exec } from './sqlite/client';
import { createTestDriver } from './sqlite/testDriver';
import { migrate } from './migrations';
import { seedDefaultCategories } from './seed';
import * as categoriesRepo from './repositories/categoriesRepo';

const USER = 'user-1';

beforeEach(() => {
  __setTestDriver(createTestDriver());
  migrate();
});

afterAll(() => {
  __setTestDriver(null);
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('seedDefaultCategories', () => {
  it('generates valid UUID-format ids — Postgres categories.id is a strict uuid column, not text', () => {
    seedDefaultCategories(USER);

    for (const category of categoriesRepo.list(USER)) {
      expect(category.id).toMatch(UUID_RE);
    }
  });

  it('is a no-op the second time (local rows already exist)', () => {
    seedDefaultCategories(USER);
    const firstPassCount = categoriesRepo.list(USER).length;

    seedDefaultCategories(USER);

    expect(categoriesRepo.list(USER)).toHaveLength(firstPassCount);
  });

  it('re-seeding after local rows were wiped reuses the same ids as before — it does not mint new ones', () => {
    seedDefaultCategories(USER);
    const idsBefore = categoriesRepo
      .list(USER)
      .map((c) => c.id)
      .sort();

    // Simulate logout's local wipe: the rows are gone locally, but (in the real bug this guards
    // against) the server still has them under their original ids.
    exec('DELETE FROM categories WHERE user_id = ?', [USER]);

    seedDefaultCategories(USER);
    const idsAfter = categoriesRepo
      .list(USER)
      .map((c) => c.id)
      .sort();

    // Same ids back — pushing these again upserts the server's existing rows instead of creating
    // duplicates that later collide with themselves on the (user_id, key) unique index when pulled.
    expect(idsAfter).toEqual(idsBefore);
  });

  it('two different users get two different sets of ids for the same keys', () => {
    seedDefaultCategories('user-a');
    seedDefaultCategories('user-b');

    const idsA = new Set(categoriesRepo.list('user-a').map((c) => c.id));
    const idsB = categoriesRepo.list('user-b').map((c) => c.id);

    for (const id of idsB) expect(idsA.has(id)).toBe(false);
  });
});
