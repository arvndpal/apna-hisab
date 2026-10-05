import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AccessTokenPayload } from '../auth/jwt.strategy.js';

/** The authenticated user's id, set by JwtAuthGuard. Use on any route guarded by JwtAuthGuard. */
export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user: AccessTokenPayload }>();
  return request.user.sub;
});
