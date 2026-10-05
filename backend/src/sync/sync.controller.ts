import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUserId } from '../common/current-user.decorator.js';
import { PullQueryDto } from './dto/pull-query.dto.js';
import { PushDto } from './dto/push.dto.js';
import { SyncService } from './sync.service.js';

@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push')
  async push(@CurrentUserId() userId: string, @Body() dto: PushDto) {
    const results = await this.sync.push(userId, dto.changes);
    return { results };
  }

  @Get('pull')
  async pull(@CurrentUserId() userId: string, @Query() query: PullQueryDto) {
    const rows = await this.sync.pull(userId, query.table, query.since, query.limit ?? 500);
    return { rows };
  }
}
