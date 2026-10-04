import { __setTestDriver } from '../sqlite/client';
import { createTestDriver } from '../sqlite/testDriver';
import { migrate } from '../migrations';
import * as udhaarRepo from './udhaarRepo';

const USER = 'user-1';

beforeEach(() => {
  __setTestDriver(createTestDriver());
  migrate();
});

afterAll(() => {
  __setTestDriver(null);
});

describe('udhaarRepo balance calculation', () => {
  it('balance = given + paid − received − took', () => {
    const person = udhaarRepo.createPerson({ userId: USER, name: 'Ramesh' });

    udhaarRepo.addEntry({
      userId: USER,
      personId: person.id,
      direction: 'given',
      amountPaise: 500000,
      occurredAt: new Date('2026-09-28'),
    });
    udhaarRepo.addEntry({
      userId: USER,
      personId: person.id,
      direction: 'received',
      amountPaise: 250000,
      occurredAt: new Date('2026-10-01'),
    });

    const balance = udhaarRepo.getPerson(person.id)!;
    expect(balance.givenPaise).toBe(500000);
    expect(balance.receivedPaise).toBe(250000);
    expect(balance.balancePaise).toBe(250000); // you will still receive ₹2,500
  });

  it('a negative balance means you need to pay (you took more than you paid back)', () => {
    const person = udhaarRepo.createPerson({ userId: USER, name: 'Suresh' });
    udhaarRepo.addEntry({
      userId: USER,
      personId: person.id,
      direction: 'took',
      amountPaise: 120000,
      occurredAt: new Date('2026-09-29'),
    });

    const balance = udhaarRepo.getPerson(person.id)!;
    expect(balance.balancePaise).toBe(-120000);
  });

  it('given + paid cancels received + took back to zero — "Hisab barabar"', () => {
    const person = udhaarRepo.createPerson({ userId: USER, name: 'Anita' });
    udhaarRepo.addEntry({
      userId: USER,
      personId: person.id,
      direction: 'took',
      amountPaise: 100000,
      occurredAt: new Date('2026-09-01'),
    });
    udhaarRepo.addEntry({
      userId: USER,
      personId: person.id,
      direction: 'paid',
      amountPaise: 100000,
      occurredAt: new Date('2026-09-15'),
    });

    expect(udhaarRepo.getPerson(person.id)!.balancePaise).toBe(0);
  });

  it('a soft-deleted entry is excluded from the balance', () => {
    const person = udhaarRepo.createPerson({ userId: USER, name: 'Deepak' });
    const entry = udhaarRepo.addEntry({
      userId: USER,
      personId: person.id,
      direction: 'given',
      amountPaise: 500000,
      occurredAt: new Date('2026-09-28'),
    });
    udhaarRepo.softDeleteEntry(entry.id);
    expect(udhaarRepo.getPerson(person.id)!.balancePaise).toBe(0);
  });

  it('totals() sums positive balances as receivable and |negative| balances as payable', () => {
    const toReceive = udhaarRepo.createPerson({ userId: USER, name: 'Ramesh' });
    udhaarRepo.addEntry({
      userId: USER,
      personId: toReceive.id,
      direction: 'given',
      amountPaise: 250000,
      occurredAt: new Date('2026-10-01'),
    });
    const toPay = udhaarRepo.createPerson({ userId: USER, name: 'Suresh' });
    udhaarRepo.addEntry({
      userId: USER,
      personId: toPay.id,
      direction: 'took',
      amountPaise: 120000,
      occurredAt: new Date('2026-09-29'),
    });

    expect(udhaarRepo.totals(USER)).toEqual({ receivePaise: 250000, payPaise: 120000 });
  });

  it('listEntriesForPerson returns entries oldest-first with a running balance', () => {
    const person = udhaarRepo.createPerson({ userId: USER, name: 'Ramesh' });
    udhaarRepo.addEntry({
      userId: USER,
      personId: person.id,
      direction: 'given',
      amountPaise: 500000,
      occurredAt: new Date('2026-09-28T10:00:00'),
    });
    udhaarRepo.addEntry({
      userId: USER,
      personId: person.id,
      direction: 'received',
      amountPaise: 150000,
      occurredAt: new Date('2026-10-01T10:00:00'),
    });

    const history = udhaarRepo.listEntriesForPerson(person.id);
    expect(history.map((h) => h.runningBalancePaise)).toEqual([500000, 350000]);
  });
});
