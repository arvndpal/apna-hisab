import { exec, runInTransaction } from '../sqlite/client';
import { newId } from '../../utils/ids';
import { nowUtcIso, toLocalIso, toOccurredOn } from '../../utils/dates';
import { enqueue } from './syncQueueRepo';
import { schedule } from '../../sync/syncEngine/engine';
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
  last_direction: UdhaarDirection | null;
  last_amount_paise: number | null;
  last_occurred_on: string | null;
};

const PERSON_WITH_BALANCE_SQL = `
  SELECT p.*, b.balance_paise, b.given_paise, b.received_paise, b.took_paise, b.paid_paise, b.last_activity_at,
    le.direction AS last_direction, le.amount_paise AS last_amount_paise, le.occurred_on AS last_occurred_on
  FROM udhaar_people p
  LEFT JOIN v_udhaar_balances b ON b.person_id = p.id
  LEFT JOIN udhaar_entries le ON le.id = (
    SELECT e2.id FROM udhaar_entries e2
    WHERE e2.person_id = p.id AND e2.deleted_at IS NULL
    ORDER BY e2.occurred_at DESC, e2.created_at DESC LIMIT 1
  )
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
    lastEntry: r.last_direction
      ? { direction: r.last_direction, amountPaise: Number(r.last_amount_paise), occurredOn: r.last_occurred_on! }
      : null,
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
  schedule();
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

/** Overflow menu "Edit name/phone" — the sheet always submits both fields, so this isn't a partial patch. */
export function updatePerson(id: string, input: { name: string; phone: string | null }): UdhaarPersonWithBalance {
  const now = nowUtcIso();
  runInTransaction(() => {
    exec("UPDATE udhaar_people SET name = ?, phone = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?", [
      input.name,
      input.phone,
      now,
      id,
    ]);
    enqueue('udhaar_people', id, 'upsert');
  });
  schedule();
  return getPerson(id)!;
}

/** Overflow menu "Delete person" — cascades to their entries too, since an orphaned entry has nowhere to live. */
export function deletePerson(id: string): void {
  const now = nowUtcIso();
  runInTransaction(() => {
    const entryIds = exec('SELECT id FROM udhaar_entries WHERE person_id = ? AND deleted_at IS NULL', [id]).rows.map(
      (r) => r.id as string,
    );
    for (const entryId of entryIds) {
      exec("UPDATE udhaar_entries SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?", [
        now,
        now,
        entryId,
      ]);
      enqueue('udhaar_entries', entryId, 'upsert');
    }
    exec("UPDATE udhaar_people SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?", [
      now,
      now,
      id,
    ]);
    enqueue('udhaar_people', id, 'upsert');
  });
  schedule();
}

/** Overflow menu "Mark as settled" — adds a balancing entry rather than a schema flag, so history stays a true ledger. */
export function markSettled(personId: string, userId: string): void {
  const person = getPerson(personId);
  if (!person || person.balancePaise === 0) return;
  addEntry({
    userId,
    personId,
    direction: person.balancePaise > 0 ? 'received' : 'paid',
    amountPaise: Math.abs(person.balancePaise),
    occurredAt: new Date(),
  });
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
  schedule();
  return exec('SELECT * FROM udhaar_entries WHERE id = ?', [id]).rows.map((r) =>
    entryFromRow(r as unknown as EntryRow),
  )[0];
}

export function getEntry(id: string): UdhaarEntry | null {
  const row = exec('SELECT * FROM udhaar_entries WHERE id = ?', [id]).rows[0];
  return row ? entryFromRow(row as unknown as EntryRow) : null;
}

export interface UpdateEntryInput {
  direction?: UdhaarDirection;
  amountPaise?: number;
  occurredAt?: Date;
  note?: string | null;
}

/** Tap an entry in History → edit sheet (SCREENS.md §13). */
export function updateEntry(id: string, patch: UpdateEntryInput): UdhaarEntry {
  const current = getEntry(id);
  if (!current) throw new Error(`Udhaar entry ${id} not found`);
  const now = nowUtcIso();
  const occurredAt = patch.occurredAt ?? new Date(current.occurredAt);

  runInTransaction(() => {
    exec(
      `UPDATE udhaar_entries SET
         direction = ?, amount_paise = ?, occurred_at = ?, occurred_on = ?, note = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ?`,
      [
        patch.direction ?? current.direction,
        patch.amountPaise ?? current.amountPaise,
        toLocalIso(occurredAt),
        toOccurredOn(occurredAt),
        patch.note !== undefined ? patch.note : current.note,
        now,
        id,
      ],
    );
    enqueue('udhaar_entries', id, 'upsert');
  });
  schedule();
  return getEntry(id)!;
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
  schedule();
}

/** Undo for the delete toast, mirroring transactionsRepo.restore. */
export function restoreEntry(id: string): void {
  const now = nowUtcIso();
  runInTransaction(() => {
    exec("UPDATE udhaar_entries SET deleted_at = NULL, updated_at = ?, sync_status = 'pending' WHERE id = ?", [
      now,
      id,
    ]);
    enqueue('udhaar_entries', id, 'upsert');
  });
  schedule();
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
