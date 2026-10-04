import { exec, runInTransaction } from '../sqlite/client';
import { newId } from '../../utils/ids';
import { nowUtcIso, toLocalIso, toOccurredOn } from '../../utils/dates';
import { enqueue } from './syncQueueRepo';
import type { UdhaarDirection, UdhaarEntry, UdhaarPersonWithBalance } from '../../types/models';

type PersonBalanceRow = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: 'pending' | 'synced';
  balance_paise: number | null;
  given_paise: number | null;
  received_paise: number | null;
  took_paise: number | null;
  paid_paise: number | null;
  last_activity_at: string | null;
};

const PERSON_WITH_BALANCE_SQL = `
  SELECT p.*, b.balance_paise, b.given_paise, b.received_paise, b.took_paise, b.paid_paise, b.last_activity_at
  FROM udhaar_people p
  LEFT JOIN v_udhaar_balances b ON b.person_id = p.id
  WHERE p.deleted_at IS NULL
`;

function fromRow(r: PersonBalanceRow): UdhaarPersonWithBalance {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    phone: r.phone,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    syncStatus: r.sync_status,
    balancePaise: Number(r.balance_paise ?? 0),
    givenPaise: Number(r.given_paise ?? 0),
    receivedPaise: Number(r.received_paise ?? 0),
    tookPaise: Number(r.took_paise ?? 0),
    paidPaise: Number(r.paid_paise ?? 0),
    lastEntry: null,
  };
}

export function listPeople(userId: string, search?: string): UdhaarPersonWithBalance[] {
  let sql = `${PERSON_WITH_BALANCE_SQL} AND p.user_id = ?`;
  const args: unknown[] = [userId];
  if (search) {
    sql += ' AND p.name LIKE ?';
    args.push(`%${search}%`);
  }
  sql += ' ORDER BY b.last_activity_at DESC';
  return exec(sql, args).rows.map((r) => fromRow(r as unknown as PersonBalanceRow));
}

export function getPerson(id: string): UdhaarPersonWithBalance | null {
  const row = exec(`${PERSON_WITH_BALANCE_SQL} AND p.id = ?`, [id]).rows[0];
  return row ? fromRow(row as unknown as PersonBalanceRow) : null;
}

/** Totals across all people: receive = sum of positive balances, pay = sum of |negative balances|. */
export function totals(userId: string): { receivePaise: number; payPaise: number } {
  const row = exec(
    `SELECT
       COALESCE(SUM(CASE WHEN balance_paise > 0 THEN balance_paise END), 0) AS receive_paise,
       COALESCE(SUM(CASE WHEN balance_paise < 0 THEN -balance_paise END), 0) AS pay_paise
     FROM v_udhaar_balances b
     JOIN udhaar_people p ON p.id = b.person_id
     WHERE p.user_id = ? AND p.deleted_at IS NULL`,
    [userId],
  ).rows[0] as { receive_paise: number; pay_paise: number };
  return { receivePaise: Number(row.receive_paise), payPaise: Number(row.pay_paise) };
}

export function createPerson(input: { userId: string; name: string; phone?: string | null }): UdhaarPersonWithBalance {
  const id = newId();
  const now = nowUtcIso();
  runInTransaction(() => {
    exec(
      `INSERT INTO udhaar_people (id, user_id, name, phone, created_at, updated_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, NULL, 'pending')`,
      [id, input.userId, input.name, input.phone ?? null, now, now],
    );
    enqueue('udhaar_people', id, 'upsert');
  });
  return getPerson(id)!;
}

/** Autocomplete flow in UdhaarEntrySheet: reuse an existing person by exact name, else create one. */
export function findOrCreatePersonByName(userId: string, name: string): UdhaarPersonWithBalance {
  const existing = exec('SELECT id FROM udhaar_people WHERE user_id = ? AND name = ? AND deleted_at IS NULL', [
    userId,
    name,
  ]).rows[0];
  if (existing) return getPerson(existing.id as string)!;
  return createPerson({ userId, name });
}

type EntryRow = {
  id: string;
  user_id: string;
  person_id: string;
  direction: UdhaarDirection;
  amount_paise: number;
  occurred_at: string;
  occurred_on: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: 'pending' | 'synced';
};

function entryFromRow(r: EntryRow): UdhaarEntry {
  return {
    id: r.id,
    userId: r.user_id,
    personId: r.person_id,
    direction: r.direction,
    amountPaise: r.amount_paise,
    occurredAt: r.occurred_at,
    occurredOn: r.occurred_on,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    syncStatus: r.sync_status,
  };
}

export interface AddEntryInput {
  userId: string;
  personId: string;
  direction: UdhaarDirection;
  amountPaise: number;
  occurredAt: Date;
  note?: string | null;
}

export function addEntry(input: AddEntryInput): UdhaarEntry {
  const id = newId();
  const now = nowUtcIso();
  runInTransaction(() => {
    exec(
      `INSERT INTO udhaar_entries (id, user_id, person_id, direction, amount_paise, occurred_at, occurred_on, note, created_at, updated_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending')`,
      [
        id,
        input.userId,
        input.personId,
        input.direction,
        input.amountPaise,
        toLocalIso(input.occurredAt),
        toOccurredOn(input.occurredAt),
        input.note ?? null,
        now,
        now,
      ],
    );
    enqueue('udhaar_entries', id, 'upsert');
  });
  return exec('SELECT * FROM udhaar_entries WHERE id = ?', [id]).rows.map((r) =>
    entryFromRow(r as unknown as EntryRow),
  )[0];
}

export function softDeleteEntry(id: string): void {
  const now = nowUtcIso();
  runInTransaction(() => {
    exec("UPDATE udhaar_entries SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?", [
      now,
      now,
      id,
    ]);
    enqueue('udhaar_entries', id, 'upsert');
  });
}

/** Oldest-first, each row carrying the running balance after it — History section in SCREENS.md §13. */
export function listEntriesForPerson(personId: string): Array<UdhaarEntry & { runningBalancePaise: number }> {
  const rows = exec('SELECT * FROM udhaar_entries WHERE person_id = ? AND deleted_at IS NULL ORDER BY occurred_at ASC', [
    personId,
  ]).rows.map((r) => entryFromRow(r as unknown as EntryRow));

  let running = 0;
  const sign: Record<UdhaarDirection, 1 | -1> = { given: 1, paid: 1, received: -1, took: -1 };
  return rows.map((entry) => {
    running += sign[entry.direction] * entry.amountPaise;
    return { ...entry, runningBalancePaise: running };
  });
}
