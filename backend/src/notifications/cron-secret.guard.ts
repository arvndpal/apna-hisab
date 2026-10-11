import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { Env } from '../config/env.validation.js';

/**
 * Guards GET /notifications/cron/daily-check — Vercel Cron calls it with no user JWT. Vercel
 * automatically sends `Authorization: Bearer <value of the CRON_SECRET env var>` on cron-triggered
 * requests (its own documented convention for securing cron endpoints), so this checks that header
 * rather than a custom one Vercel wouldn't actually send.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    const expected = `Bearer ${this.config.get('CRON_SECRET', { infer: true })}`;

    if (typeof header !== 'string' || header.length !== expected.length) {
      throw new UnauthorizedException();
    }
    if (!timingSafeEqual(Buffer.from(header), Buffer.from(expected))) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
