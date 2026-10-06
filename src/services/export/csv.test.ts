import type { TFunction } from 'i18next';
import { buildTransactionsCsv, buildUdhaarCsv, csvCell, paiseToPlainRupees } from './csv';
import type { Category, Transaction, UdhaarEntry } from '../../types/models';

const t = ((key: string) => key) as unknown as TFunction;

const fuel: Category = {
  id: 'cat-fuel',
  userId: 'u',
  key: 'fuel',
  type: 'expense',
  name: null,
  nameHi: 'ईंधन',
  icon: 'Fuel',
  sort: 2,
  isDefault: true,
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  syncStatus: 'synced',
};

function txn(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'x',
    userId: 'u',
    type: 'expense',
    amountPaise: 50000,
    categoryId: 'cat-fuel',
    paymentMethod: 'cash',
    occurredAt: '2026-10-03T09:05:00+05:30',
    occurredOn: '2026-10-03',
    note: null,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    syncStatus: 'synced',
    ...overrides,
  } as Transaction;
}

describe('csvCell', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
    expect(csvCell(null)).toBe('');
  });
});

describe('paiseToPlainRupees', () => {
  it('formats integer paise without floats or grouping', () => {
    expect(paiseToPlainRupees(0)).toBe('0.00');
    expect(paiseToPlainRupees(5)).toBe('0.05');
    expect(paiseToPlainRupees(25000050)).toBe('250000.50');
    expect(paiseToPlainRupees(-12345)).toBe('-123.45');
  });
});

describe('buildTransactionsCsv', () => {
  it('writes a BOM, a header and rows oldest first, expenses negative', () => {
    const csv = buildTransactionsCsv(
      [
        txn({ id: 'b', occurredAt: '2026-10-04T18:30:00+05:30', occurredOn: '2026-10-04', type: 'income', amountPaise: 120000, note: 'Trip, airport' }),
        txn({ id: 'a' }),
      ],
      { [fuel.id]: fuel },
      t,
      'hi',
    );
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines[0]).toBe('export.colDate,export.colTime,export.colType,export.colCategory,export.colAmount,export.colPayment,export.colNote');
    expect(lines[1]).toBe('2026-10-03,09:05,transactions.expense,ईंधन,-500.00,payment.cash,');
    expect(lines[2]).toBe('2026-10-04,18:30,transactions.income,ईंधन,1200.00,payment.cash,"Trip, airport"');
  });
});

describe('buildUdhaarCsv', () => {
  it('writes one row per entry with the person name', () => {
    const entry = {
      id: 'e',
      userId: 'u',
      personId: 'p',
      personName: 'Ramesh',
      direction: 'given',
      amountPaise: 200000,
      occurredAt: '2026-10-02T10:00:00+05:30',
      occurredOn: '2026-10-02',
      note: null,
    } as unknown as UdhaarEntry & { personName: string };
    const lines = buildUdhaarCsv([entry], t).slice(1).trimEnd().split('\r\n');
    expect(lines[1]).toBe('2026-10-02,Ramesh,udhaar.given,2000.00,');
  });
});
