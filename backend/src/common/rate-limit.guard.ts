import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const WINDOW_MS = 60_000;
const LIMIT = 60;

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Minimal per-IP fixed-window rate limit (60 req/min), replacing @nestjs/throttler. That package's
 * compiled CJS output require()s @nestjs/common, which ships ESM-only as of v12 — that only
 * resolves via Node's require(esm) interop (stable since 22.12), which Vercel's serverless runtime
 * doesn't support, crashing every single request. In-memory and per-instance only, same limitation
 * the package it replaces had in a serverless deployment — not a global/shared limit.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, Bucket>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.ip ?? 'unknown';
    const now = Date.now();

    // Opportunistic cleanup so a long-lived instance doesn't accumulate stale entries forever.
    if (this.hits.size > 5000) {
      for (const [k, b] of this.hits) if (now > b.resetAt) this.hits.delete(k);
    }

    const bucket = this.hits.get(key);
    if (!bucket || now > bucket.resetAt) {
      this.hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }
    if (bucket.count >= LIMIT) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    bucket.count += 1;
    return true;
  }
}
