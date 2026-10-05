import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type QueryResultRow } from 'pg';
import type { Env } from '../config/env.validation.js';

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
