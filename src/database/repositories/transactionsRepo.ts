import { exec, runInTransaction } from '../sqlite/client';
import { newId } from '../../utils/ids';
import { nowUtcIso, toLocalIso, toOccurredOn } from '../../utils/dates';
import { enqueue } from './syncQueueRepo';
import { schedule } from '../../sync/syncEngine/engine';
import type { PaymentMethod, Summary, Transaction, TransactionType } from '../../types/models';

type TransactionRow = {
  id: string;
  user_id: string;
  type: TransactionType;
  amount_paise: number;
  category_id: string;
  payment_method: PaymentMethod;
  occurred_at: string;
  occurred_on: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: 'pending' | 'synced';
};

function fromRow(r: TransactionRow): Transaction {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    amountPaise: r.amount_paise,
    categoryId: r.category_id,
    paymentMethod: r.payment_method,
    occurredAt: r.occurred_at,
    occurredOn: r.occurred_on,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    syncStatus: r.sync_status,
  };
}

export interface CreateTransactionInput {
  userId: string;
  type: TransactionType;
  amountPaise: number;
  categoryId: string;
  paymentMethod: PaymentMethod;
  occurredAt: Date;
  note?: string | null;
}

export function create(input: CreateTransactionInput): Transaction {
  const id = newId();
  const now = nowUtcIso();

  runInTransaction(() => {
    exec(
      `INSERT INTO transactions
         (id, user_id, type, amount_paise, category_id, payment_method, occurred_at, occurred_on, note, created_at, updated_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending')`,
      [
        id,
        input.userId,
        input.type,
        input.amountPaise,
        input.categoryId,
        input.paymentMethod,
        toLocalIso(input.occurredAt),
        toOccurredOn(input.occurredAt),
        input.note ?? null,
        now,
        now,
      ],
    );
    enqueue('transactions', id, 'upsert');
    schedule();
  });

  return getById(id)!;
}

export type UpdateTransactionInput = Partial<
  Omit<CreateTransactionInput, 'userId'>
>;

export function update(id: string, patch: UpdateTransactionInput): Transaction {
  const current = getById(id);
  if (!current) throw new Error(`Transaction ${id} not found`);
  const now = nowUtcIso();
  const occurredAt = patch.occurredAt ?? new Date(current.occurredAt);

  runInTransaction(() => {
    exec(
      `UPDATE transactions SET
         type = ?, amount_paise = ?, category_id = ?, payment_method = ?,
         occurred_at = ?, occurred_on = ?, note = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ?`,
      [
        patch.type ?? current.type,
        patch.amountPaise ?? current.amountPaise,
        patch.categoryId ?? current.categoryId,
        patch.paymentMethod ?? current.paymentMethod,
        toLocalIso(occurredAt),
        toOccurredOn(occurredAt),
        patch.note !== undefined ? patch.note : current.note,
        now,
        id,
      ],
    );
    enqueue('transactions', id, 'upsert');
    schedule();
  });

  return getById(id)!;
}

export function softDelete(id: string): void {
  const now = nowUtcIso();
  runInTransaction(() => {
    exec("UPDATE transactions SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?", [
      now,
      now,
      id,
    ]);
    enqueue('transactions', id, 'upsert');
    schedule();
  });
}

/** Undo for the 5s post-delete toast. */
export function restore(id: string): void {
  const now = nowUtcIso();
  runInTransaction(() => {
    exec("UPDATE transactions SET deleted_at = NULL, updated_at = ?, sync_status = 'pending' WHERE id = ?", [
      now,
      id,
    ]);
    enqueue('transactions', id, 'upsert');
    schedule();
  });
}

export function getById(id: string): Transaction | null {
  const row = exec('SELECT * FROM transactions WHERE id = ?', [id]).rows[0];
  return row ? fromRow(row as unknown as TransactionRow) : null;
}

export interface ListParams {
  userId: string;
  from?: string; // YYYY-MM-DD inclusive
  to?: string; // YYYY-MM-DD inclusive
  type?: TransactionType;
  categoryIds?: string[];
  paymentMethods?: PaymentMethod[];
  search?: string;
  minPaise?: number;
  maxPaise?: number;
  limit?: number;
  offset?: number;
}

export function list(params: ListParams): Transaction[] {
  const where: string[] = ['user_id = ?', 'deleted_at IS NULL'];
  const args: unknown[] = [params.userId];

  if (params.from) {
    where.push('occurred_on >= ?');
    args.push(params.from);
  }
  if (params.to) {
    where.push('occurred_on <= ?');
    args.push(params.to);
  }
  if (params.type) {
    where.push('type = ?');
    args.push(params.type);
  }
  if (params.categoryIds?.length) {
    where.push(`category_id IN (${params.categoryIds.map(() => '?').join(',')})`);
    args.push(...params.categoryIds);
  }
  if (params.paymentMethods?.length) {
    where.push(`payment_method IN (${params.paymentMethods.map(() => '?').join(',')})`);
    args.push(...params.paymentMethods);
  }
  if (params.search) {
    where.push('(note LIKE ? OR CAST(amount_paise AS TEXT) LIKE ?)');
    args.push(`%${params.search}%`, `%${params.search}%`);
  }
  if (params.minPaise != null) {
    where.push('amount_paise >= ?');
    args.push(params.minPaise);
  }
  if (params.maxPaise != null) {
    where.push('amount_paise <= ?');
    args.push(params.maxPaise);
  }

  let sql = `SELECT * FROM transactions WHERE ${where.join(' AND ')} ORDER BY occurred_at DESC`;
  if (params.limit != null) {
    sql += ' LIMIT ?';
    args.push(params.limit);
    if (params.offset != null) {
      sql += ' OFFSET ?';
      args.push(params.offset);
    }
  }

  return exec(sql, args).rows.map((r) => fromRow(r as unknown as TransactionRow));
}

/** income − expense for the range; Udhaar never enters this. */
export function summary(params: { userId: string; from: string; to: string }): Summary {
  const row = exec(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_paise END), 0) AS income_paise,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_paise END), 0) AS expense_paise
     FROM transactions
     WHERE user_id = ? AND deleted_at IS NULL AND occurred_on BETWEEN ? AND ?`,
    [params.userId, params.from, params.to],
  ).rows[0] as { income_paise: number; expense_paise: number };

  const incomePaise = Number(row.income_paise);
  const expensePaise = Number(row.expense_paise);
  return { incomePaise, expensePaise, netPaise: incomePaise - expensePaise };
}

export function recentForUser(userId: string, limit: number): Transaction[] {
  return list({ userId, limit });
}
