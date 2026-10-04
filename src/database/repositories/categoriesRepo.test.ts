import { __setTestDriver } from '../sqlite/client';
import { createTestDriver } from '../sqlite/testDriver';
import { migrate } from '../migrations';
import { seedDefaultCategories } from '../seed';
import * as categoriesRepo from './categoriesRepo';
import * as transactionsRepo from './transactionsRepo';

const USER = 'user-1';

beforeEach(() => {
  __setTestDriver(createTestDriver());
  migrate();
});

afterAll(() => {
  __setTestDriver(null);
});

describe('categoriesRepo', () => {
  it('seeds default income and expense categories', () => {
    seedDefaultCategories(USER);
    const income = categoriesRepo.list(USER, 'income');
    const expense = categoriesRepo.list(USER, 'expense');
    expect(income.map((c) => c.key)).toContain('salary');
    expect(expense.map((c) => c.key)).toContain('food');
    expect(expense.map((c) => c.key)).toContain('other_expense');
  });

  it('is idempotent — seeding twice does not duplicate rows', () => {
    seedDefaultCategories(USER);
    seedDefaultCategories(USER);
    expect(categoriesRepo.list(USER)).toHaveLength(
      categoriesRepo.list(USER, 'income').length + categoriesRepo.list(USER, 'expense').length,
    );
    expect(categoriesRepo.list(USER, 'expense').filter((c) => c.key === 'food')).toHaveLength(1);
  });

  it('creates a user category with no key and an incrementing sort', () => {
    seedDefaultCategories(USER);
    const created = categoriesRepo.create({ userId: USER, type: 'expense', name: 'Pets', icon: 'PawPrint' });
    expect(created.key).toBeNull();
    expect(created.isDefault).toBe(false);
    expect(created.sort).toBeGreaterThan(0);
  });

  it('categoryDisplayName prefers a user rename, then the localized default', () => {
    seedDefaultCategories(USER);
    const fuel = categoriesRepo.list(USER, 'expense').find((c) => c.key === 'fuel')!;
    expect(categoriesRepo.categoryDisplayName(fuel, 'en')).toBe('Fuel');
    expect(categoriesRepo.categoryDisplayName(fuel, 'hi')).toBe('ईंधन');

    const renamed = categoriesRepo.update(fuel.id, { name: 'Petrol' });
    expect(categoriesRepo.categoryDisplayName(renamed, 'en')).toBe('Petrol');
    expect(categoriesRepo.categoryDisplayName(renamed, 'hi')).toBe('Petrol');
  });

  it('deleting a category reassigns its transactions to "Other" and soft-deletes it', () => {
    seedDefaultCategories(USER);
    const fuel = categoriesRepo.list(USER, 'expense').find((c) => c.key === 'fuel')!;
    const other = categoriesRepo.list(USER, 'expense').find((c) => c.key === 'other_expense')!;

    const txn = transactionsRepo.create({
      userId: USER,
      type: 'expense',
      amountPaise: 30000,
      categoryId: fuel.id,
      paymentMethod: 'cash',
      occurredAt: new Date('2026-01-05T09:00:00'),
    });

    categoriesRepo.softDelete(fuel.id);

    expect(categoriesRepo.getById(fuel.id)?.deletedAt).not.toBeNull();
    expect(transactionsRepo.getById(txn.id)?.categoryId).toBe(other.id);
  });

  it('never deletes the "Other" category', () => {
    seedDefaultCategories(USER);
    const other = categoriesRepo.list(USER, 'expense').find((c) => c.key === 'other_expense')!;
    categoriesRepo.softDelete(other.id);
    expect(categoriesRepo.getById(other.id)?.deletedAt).toBeNull();
  });
});
