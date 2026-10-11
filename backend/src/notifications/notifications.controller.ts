import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUserId } from '../common/current-user.decorator.js';
import { RegisterTokenDto } from './dto/register-token.dto.js';
import { DeleteTokenDto } from './dto/delete-token.dto.js';
import { SendNotificationDto } from './dto/send-notification.dto.js';
import { CronSecretGuard } from './cron-secret.guard.js';
import { AdminGuard } from './admin.guard.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('register-token')
  @HttpCode(200)
  async registerToken(@CurrentUserId() userId: string, @Body() dto: RegisterTokenDto) {
    await this.notifications.registerToken(userId, dto.token, dto.platform);
    return { registered: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('register-token')
  @HttpCode(200)
  async deleteToken(@CurrentUserId() userId: string, @Body() dto: DeleteTokenDto) {
    await this.notifications.deleteToken(userId, dto.token);
    return { deleted: true };
  }

  /** Vercel Cron only ever invokes via GET (see vercel.json's crons entry). */
  @UseGuards(CronSecretGuard)
  @Get('cron/daily-check')
  async dailyCheck() {
    return this.notifications.runDailyCheck();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/users')
  async searchUsers(@Query('q') q?: string) {
    const users = await this.notifications.searchUsers(q ?? '');
    return { users };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/device-count')
  async deviceCount() {
    const count = await this.notifications.countAllDevices();
    return { count };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/send')
  @HttpCode(200)
  async sendNotification(@Body() dto: SendNotificationDto) {
    if (dto.target === 'user') {
      if (!dto.userIds || dto.userIds.length === 0) throw new BadRequestException('userIds is required when target is "user"');
      return this.notifications.sendToUsers(dto.userIds, { title: dto.title, body: dto.body });
    }
    return this.notifications.sendToAll({ title: dto.title, body: dto.body });
  }
}
