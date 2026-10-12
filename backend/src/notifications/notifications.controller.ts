import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUserId } from '../common/current-user.decorator.js';
import { RegisterTokenDto } from './dto/register-token.dto.js';
import { DeleteTokenDto } from './dto/delete-token.dto.js';
import { SendNotificationDto } from './dto/send-notification.dto.js';
import { CronSecretGuard } from './cron-secret.guard.js';
import { AdminGuard } from './admin.guard.js';
import { NotificationsService, reminderSlotForNow } from './notifications.service.js';

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

  /**
   * The one cron slot Vercel Hobby actually fires (once daily, 08:00 PM IST — see vercel.json).
   * Sends an unconditional "log today's transactions" reminder to every registered device.
   */
  @UseGuards(CronSecretGuard)
  @Get('cron/daily-check')
  async dailyCheck() {
    return this.notifications.runDailyReminder();
  }

  /**
   * Not wired to any Vercel Cron (Hobby can't fire more than once/day) — call this 3x/day
   * (09:00/15:00/21:00 IST) from an external scheduler, or re-add it to vercel.json on a Pro plan.
   */
  @UseGuards(CronSecretGuard)
  @Get('cron/reminder')
  async reminderCheck() {
    const slot = reminderSlotForNow();
    if (!slot) return { usersNotified: 0, skipped: true };
    return this.notifications.runReminderCheck(slot);
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
