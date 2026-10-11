import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { firebaseMessagingProvider } from './firebase-messaging.provider.js';
import { CronSecretGuard } from './cron-secret.guard.js';
import { AdminGuard } from './admin.guard.js';

/** Imports AuthModule so JwtStrategy ('jwt', used by JwtAuthGuard) is registered. */
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, firebaseMessagingProvider, CronSecretGuard, AdminGuard],
})
export class NotificationsModule {}
