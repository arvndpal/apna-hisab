import { z } from 'zod';

/**
 * This backend is the sole integration point with the database — the mobile app never talks to
 * Postgres/Supabase directly. We connect straight to Postgres (Supabase's connection pooler) with
 * `pg`, not the Supabase SDK, so there's no Supabase Auth/RLS session involved at all; this
 * backend is the sole authority that issues its own JWTs and enforces per-user authorization in
 * application code (see sync/sync.service.ts) by hand-filtering every query on user_id.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  /** Supabase's transaction-mode pooler connection string (pgbouncer=true), e.g.
   *  postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true */
  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  /** The full JSON content of the Firebase service account key (Firebase Console → Project
   *  Settings → Service accounts → Generate new private key), as a single-line string. Used to
   *  verify the Firebase ID tokens the app sends — never the raw Google ID token directly. */
  FIREBASE_SERVICE_ACCOUNT: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
