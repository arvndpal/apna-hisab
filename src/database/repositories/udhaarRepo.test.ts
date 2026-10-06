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

  it('getPerson().lastEntry reflects the most recent non-deleted entry', () => {
    const person = udhaarRepo.createPerson({ userId: USER, name: 'Ramesh' });
    expect(udhaarRepo.getPerson(person.id)!.lastEntry).toBeNull();

    udhaarRepo.addEntry({ userId: USER, personId: person.id, direction: 'given', amountPaise: 500000, occurredAt: new Date('2026-09-28') });
    const latest = udhaarRepo.addEntry({ userId: USER, personId: person.id, direction: 'received', amountPaise: 150000, occurredAt: new Date('2026-10-01') });

    expect(udhaarRepo.getPerson(person.id)!.lastEntry).toEqual({ direction: 'received', amountPaise: 150000, occurredOn: '2026-10-01' });

    udhaarRepo.softDeleteEntry(latest.id);
    expect(udhaarRepo.getPerson(person.id)!.lastEntry).toMatchObject({ direction: 'given', amountPaise: 500000 });
  });

  it('updatePerson renames and re-queues the person', () => {
    const person = udhaarRepo.createPerson({ userId: USER, name: 'Ramesh' });
    const updated = udhaarRepo.updatePerson(person.id, { name: 'Ramesh Kumar', phone: '9876543210' });
    expect(updated.name).toBe('Ramesh Kumar');
    expect(updated.phone).toBe('9876543210');
  });

  it('deletePerson cascades to their entries and drops them from totals', () => {
    const person = udhaarRepo.createPerson({ userId: USER, name: 'Ramesh' });
    udhaarRepo.addEntry({ userId: USER, personId: person.id, direction: 'given', amountPaise: 250000, occurredAt: new Date('2026-10-01') });

    udhaarRepo.deletePerson(person.id);

    expect(udhaarRepo.getPerson(person.id)).toBeNull();
    expect(udhaarRepo.listPeople(USER)).toHaveLength(0);
    expect(udhaarRepo.totals(USER)).toEqual({ receivePaise: 0, payPaise: 0 });
  });

  it('updateEntry changes fields and recomputes the balance', () => {
    const person = udhaarRepo.createPerson({ userId: USER, name: 'Ramesh' });
    const entry = udhaarRepo.addEntry({ userId: USER, personId: person.id, direction: 'given', amountPaise: 250000, occurredAt: new Date('2026-10-01') });

    const updated = udhaarRepo.updateEntry(entry.id, { amountPaise: 500000, note: 'Corrected' });
    expect(updated.amountPaise).toBe(500000);
    expect(updated.note).toBe('Corrected');
    expect(udhaarRepo.getPerson(person.id)!.balancePaise).toBe(500000);
  });

  it('markSettled adds a balancing entry that zeroes the balance, and is a no-op when already settled', () => {
    const person = udhaarRepo.createPerson({ userId: USER, name: 'Ramesh' });
    udhaarRepo.addEntry({ userId: USER, personId: person.id, direction: 'given', amountPaise: 250000, occurredAt: new Date('2026-10-01') });

    udhaarRepo.markSettled(person.id, USER);
    expect(udhaarRepo.getPerson(person.id)!.balancePaise).toBe(0);

    const entriesBefore = udhaarRepo.listEntriesForPerson(person.id).length;
    udhaarRepo.markSettled(person.id, USER); // already settled — no new entry
    expect(udhaarRepo.listEntriesForPerson(person.id)).toHaveLength(entriesBefore);
  });

  it('markSettled on a negative balance adds a "paid" entry', () => {
    const person = udhaarRepo.createPerson({ userId: USER, name: 'Suresh' });
    udhaarRepo.addEntry({ userId: USER, personId: person.id, direction: 'took', amountPaise: 120000, occurredAt: new Date('2026-09-29') });

    udhaarRepo.markSettled(person.id, USER);

    const history = udhaarRepo.listEntriesForPerson(person.id);
    expect(history[history.length - 1].direction).toBe('paid');
    expect(udhaarRepo.getPerson(person.id)!.balancePaise).toBe(0);
  });
});

describe('udhaarRepo.listEntriesInRange', () => {
  it('returns live entries in the range, oldest first, with the person name', () => {
    const ramesh = udhaarRepo.createPerson({ userId: USER, name: 'Ramesh' });
    const add = (day: number, amountPaise: number) =>
      udhaarRepo.addEntry({ userId: USER, personId: ramesh.id, direction: 'given', amountPaise, occurredAt: new Date(2026, 9, day, 10) });

    add(1, 100);
    const deleted = add(3, 300);
    add(2, 200);
    add(20, 999);
    udhaarRepo.softDeleteEntry(deleted.id);

    const entries = udhaarRepo.listEntriesInRange(USER, '2026-10-01', '2026-10-10');
    expect(entries.map((e) => e.amountPaise)).toEqual([100, 200]);
    expect(entries[0].personName).toBe('Ramesh');
  });
});
