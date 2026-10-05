import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, types, type QueryResultRow } from 'pg';
import type { Env } from '../config/env.validation.js';

// pg's default DATE (OID 1082) parser returns a JS Date at UTC midnight, which then
// round-trips through JSON as a full "...T00:00:00.000Z" timestamp — not the plain
// 'YYYY-MM-DD' string occurred_on/occurred_at columns are stored and compared as on
// the mobile app's side. Keep the raw text Postgres already sends instead.
types.setTypeParser(1082, (value: string) => value);

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

  async onModuleDestroy() {
    await this.pool.end();
  }
}
