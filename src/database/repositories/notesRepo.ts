import { exec, runInTransaction } from '../sqlite/client';
import { newId } from '../../utils/ids';
import { nowUtcIso } from '../../utils/dates';
import { enqueue } from './syncQueueRepo';
import { schedule } from '../../sync/syncEngine/engine';
import type { Note } from '../../types/models';

type NoteRow = {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: 'pending' | 'synced';
};

function fromRow(r: NoteRow): Note {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    syncStatus: r.sync_status,
  };
}

/** Most recently updated first — Diary tab (keep it simple, no search/filter). */
export function list(userId: string): Note[] {
  return exec('SELECT * FROM notes WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC', [userId]).rows.map(
    (r) => fromRow(r as unknown as NoteRow),
  );
}

export function getById(id: string): Note | null {
  const row = exec('SELECT * FROM notes WHERE id = ?', [id]).rows[0];
  return row ? fromRow(row as unknown as NoteRow) : null;
}

export function create(input: { userId: string; title: string | null; body: string }): Note {
  const id = newId();
  const now = nowUtcIso();
  runInTransaction(() => {
    exec(
      `INSERT INTO notes (id, user_id, title, body, created_at, updated_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, NULL, 'pending')`,
      [id, input.userId, input.title, input.body, now, now],
    );
    enqueue('notes', id, 'upsert');
  });
  schedule();
  return getById(id)!;
}

export function update(id: string, input: { title: string | null; body: string }): Note {
  const now = nowUtcIso();
  runInTransaction(() => {
    exec("UPDATE notes SET title = ?, body = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?", [
      input.title,
      input.body,
      now,
      id,
    ]);
    enqueue('notes', id, 'upsert');
  });
  schedule();
  return getById(id)!;
}

export function softDelete(id: string): void {
  const now = nowUtcIso();
  runInTransaction(() => {
    exec("UPDATE notes SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?", [now, now, id]);
    enqueue('notes', id, 'upsert');
  });
  schedule();
}
