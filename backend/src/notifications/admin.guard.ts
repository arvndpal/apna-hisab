import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { DatabaseService } from '../database/database.service.js';
import type { AccessTokenPayload } from '../auth/jwt.strategy.js';

/**
 * Stacks on JwtAuthGuard (@UseGuards(JwtAuthGuard, AdminGuard) — guards run in order, so the JWT
 * must already be validated). Looks up profiles.user_type fresh on every request rather than
 * trusting a JWT claim, so revoking admin access takes effect immediately instead of waiting for
 * the access token to expire.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user: AccessTokenPayload }>();
    const rows = await this.db.query<{ user_type: string }>('SELECT user_type FROM profiles WHERE id = $1', [req.user.sub]);
    if (rows[0]?.user_type !== 'admin') throw new ForbiddenException();
    return true;
  }
}
