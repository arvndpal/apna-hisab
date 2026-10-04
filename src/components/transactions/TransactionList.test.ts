import { groupByDay } from './TransactionList';
import { toOccurredOn } from '../../utils/dates';
import type { Transaction } from '../../types/models';

const t = (key: string, opts?: Record<string, unknown>) => {
  if (key === 'transactions.todayHeader') return `Today · ${opts?.date}`;
  if (key === 'transactions.yesterdayHeader') return `Yesterday · ${opts?.date}`;
  return key;
};

function makeTxn(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? 'id',
    userId: 'u1',
    type: 'expense',
    amountPaise: 10000,
    categoryId: 'c1',
    paymentMethod: 'cash',
    occurredAt: overrides.occurredAt ?? '2026-10-03T09:00:00+05:30',
    occurredOn: overrides.occurredOn ?? '2026-10-03',
    note: null,
    createdAt: '2026-10-03T03:30:00.000Z',
    updatedAt: '2026-10-03T03:30:00.000Z',
    deletedAt: null,
    syncStatus: 'pending',
    ...overrides,
  };
}

describe('groupByDay', () => {
  it('groups transactions by occurredOn and computes each day\'s net (income − expense)', () => {
    const today = toOccurredOn(new Date());
    const txns = [
      makeTxn({ id: '1', type: 'income', amountPaise: 285000, occurredOn: today }),
      makeTxn({ id: '2', type: 'expense', amountPaise: 75000, occurredOn: today }),
    ];
    const sections = groupByDay(txns, t as never);
    expect(sections).toHaveLength(1);
    expect(sections[0].netPaise).toBe(210000);
    expect(sections[0].data).toHaveLength(2);
    expect(sections[0].title).toContain('Today');
  });

  it('labels yesterday distinctly from a plain older date', () => {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toOccurredOn(yesterdayDate);
    const older = '2020-01-01';

    const sections = groupByDay(
      [makeTxn({ id: '1', occurredOn: yesterday }), makeTxn({ id: '2', occurredOn: older })],
      t as never,
    );

    const yesterdaySection = sections.find((s) => s.occurredOn === yesterday);
    const olderSection = sections.find((s) => s.occurredOn === older);
    expect(yesterdaySection?.title).toContain('Yesterday');
    expect(olderSection?.title).not.toContain('Yesterday');
    expect(olderSection?.title).not.toContain('Today');
  });

  it('keeps separate days in separate sections, each with its own net', () => {
    const sections = groupByDay(
      [
        makeTxn({ id: '1', type: 'income', amountPaise: 100000, occurredOn: '2026-09-01' }),
        makeTxn({ id: '2', type: 'expense', amountPaise: 40000, occurredOn: '2026-09-02' }),
      ],
      t as never,
    );
    expect(sections).toHaveLength(2);
    expect(sections.find((s) => s.occurredOn === '2026-09-01')?.netPaise).toBe(100000);
    expect(sections.find((s) => s.occurredOn === '2026-09-02')?.netPaise).toBe(-40000);
  });
});
