import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, types, type QueryResultRow } from 'pg';
import type { Env } from '../config/env.validation.js';

// pg's default DATE (OID 1082) parser returns a JS Date at UTC midnight, which then
// round-trips through JSON as a full "...T00:00:00.000Z" timestamp — not the plain
// 'YYYY-MM-DD' string occurred_on/occurred_at columns are stored and compared as on
// the mobile app's side. Keep the raw text Postgres already sends instead.
types.setTypeParser(1082, (value: string) => value);

export type TxQuery = <T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]) => Promise<T[]>;

/**
 * Thin wrapper over a pg Pool — connects directly to Postgres via Supabase's connection pooler,
 * not the Supabase SDK. No RLS/auth.uid() session exists on this connection; every query in
 * auth/sync services MUST filter by user_id explicitly.
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly pool: Pool;

  constructor(config: ConfigService<Env, true>) {
    this.pool = new Pool({ connectionString: config.get('DATABASE_URL', { infer: true }) });
  }

  query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.pool.query<T>(sql, params).then((result) => result.rows);
  }

  /** Runs `fn` inside BEGIN/COMMIT on one pooled connection; rolls back and rethrows on any error. */
  async transaction<T>(fn: (query: TxQuery) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn((sql, params = []) => client.query(sql, params).then((r) => r.rows));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
